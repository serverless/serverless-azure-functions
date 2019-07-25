import { WebSiteManagementClient } from "@azure/arm-appservice";
import { FunctionEnvelope, Site } from "@azure/arm-appservice/esm/models";
import fs from "fs";
import path from "path";
import Serverless from "serverless";
import { FunctionAppResource } from "../armTemplates/resources/functionApp";
import { ArmDeployment } from "../models/armTemplates";
import { FunctionAppHttpTriggerConfig } from "../models/functionApp";
import { Guard } from "../shared/guard";
import { ArmService } from "./armService";
import { AzureBlobStorageService } from "./azureBlobStorageService";
import { BaseService } from "./baseService";
import { Utils } from "../shared/utils";

export class FunctionAppService extends BaseService {
  private webClient: WebSiteManagementClient;
  private blobService: AzureBlobStorageService;

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);

    this.webClient = new WebSiteManagementClient(this.credentials, this.subscriptionId);
    this.blobService = new AzureBlobStorageService(serverless, options);
  }

  public async get(): Promise<Site> {
    const response: any = await this.webClient.webApps.get(this.resourceGroup, FunctionAppResource.getResourceName(this.config));
    if (response.error && (response.error.code === "ResourceNotFound" || response.error.code === "ResourceGroupNotFound")) {
      this.serverless.cli.log(this.resourceGroup);
      this.serverless.cli.log(FunctionAppResource.getResourceName(this.config));
      this.serverless.cli.log(JSON.stringify(response));
      return null;
    }

    return response;
  }

  public async getMasterKey(functionApp?: Site) {
    functionApp = functionApp || await this.get();
    const adminToken = await this.getAuthKey(functionApp);
    const keyUrl = `https://${functionApp.defaultHostName}/admin/host/systemkeys/_master`;

    const response = await this.sendApiRequest("GET", keyUrl, {
      json: true,
      headers: {
        "Authorization": `Bearer ${adminToken}`
      }
    });

    return response.data.value;
  }

  public async deleteFunction(functionApp: Site, functionName: string) {
    Guard.null(functionApp);
    Guard.empty(functionName);

    this.log(`-> Deleting function: ${functionName}`);
    const deleteFunctionUrl = `${this.baseUrl}${functionApp.id}/functions/${functionName}?api-version=2016-08-01`;

    return await this.sendApiRequest("DELETE", deleteFunctionUrl);
  }

  public async syncTriggers(functionApp: Site) {
    Guard.null(functionApp);

    this.log("Syncing function triggers");

    const syncTriggersUrl = `${this.baseUrl}${functionApp.id}/syncfunctiontriggers?api-version=2016-08-01`;
    return await this.sendApiRequest("POST", syncTriggersUrl);
  }

  public async cleanUp(functionApp: Site) {
    Guard.null(functionApp);

    this.log("Cleaning up existing functions");
    const deleteTasks = [];

    const serviceFunctions = this.serverless.service.getAllFunctions();
    const deployedFunctions = await this.listFunctions(functionApp);

    deployedFunctions.forEach((func) => {
      if (serviceFunctions.includes(func.name)) {
        deleteTasks.push(this.deleteFunction(functionApp, func.name));
      }
    });

    return await Promise.all(deleteTasks);
  }

  public async listFunctions(functionApp: Site): Promise<FunctionEnvelope[]> {
    Guard.null(functionApp);

    const getTokenUrl = `${this.baseUrl}${functionApp.id}/functions?api-version=2016-08-01`;
    try {
      const response = await Utils.runWithRetry(async () => {
        const listFunctionsResponse = await this.sendApiRequest("GET", getTokenUrl);

        if (listFunctionsResponse.status !== 200 || listFunctionsResponse.data.value.length === 0) {
          this.log("-> Function App not ready. Retrying...");
          throw new Error(listFunctionsResponse.data);
        }

        return listFunctionsResponse;
      }, 10, 5000);

      return response.data.value.map((functionConfig) => functionConfig.properties);
    }
    catch (e) {
      this.log("Unable to retrieve function app list");
      return [];
    }
  }

  /**
   * Gets the configuration of the specified function within the function app
   * @param functionApp The parent function app
   * @param functionName The name of hte function
   */
  public async getFunction(functionApp: Site, functionName: string): Promise<FunctionEnvelope> {
    Guard.null(functionApp);
    Guard.empty(functionName);

    const getFunctionUrl = `${this.baseUrl}${functionApp.id}/functions/${functionName}?api-version=2016-08-01`;

    try {
      const response = await Utils.runWithRetry(async () => {
        const getFunctionResponse = await this.sendApiRequest("GET", getFunctionUrl);

        if (getFunctionResponse.status !== 200) {
          this.log("-> Function app not ready. Retrying...")
          throw new Error(response.data);
        }

        return getFunctionResponse;
      }, 10, 5000);

      return response.data.properties;
    } catch (e) {
      return null;
    }
  }

  public async uploadFunctions(functionApp: Site): Promise<any> {
    Guard.null(functionApp, "functionApp");

    this.log("Deploying serverless functions...");

    const functionZipFile = this.getFunctionZipFile();
    const uploadFunctionApp = this.uploadZippedArfifactToFunctionApp(functionApp, functionZipFile);
    const uploadBlobStorage = this.uploadZippedArtifactToBlobStorage(functionZipFile);
    await Promise.all([uploadFunctionApp, uploadBlobStorage]);


    this.log("Deployed serverless functions:")
    const serverlessFunctions = this.serverless.service.getAllFunctions();
    const deployedFunctions = await this.listFunctions(functionApp);

    // List functions that are part of the serverless yaml config
    deployedFunctions.forEach((functionConfig) => {
      if (serverlessFunctions.includes(functionConfig.name)) {
        const httpConfig = this.getFunctionHttpTriggerConfig(functionApp, functionConfig);

        if (httpConfig) {
          const method = httpConfig.methods[0].toUpperCase();
          this.log(`-> ${functionConfig.name}: ${method} ${httpConfig.url}`);
        }
      }
    });
  }

  /**
   * create all necessary resources as defined in src/provider/armTemplates
   *    resource-group, storage account, app service plan, and app service at the minimum
   */
  public async deploy() {
    this.log(`Creating function app: ${this.serviceName}`);

    const armService = new ArmService(this.serverless, this.options);
    let deployment: ArmDeployment = this.config.provider.armTemplate
      ? await armService.createDeploymentFromConfig(this.config.provider.armTemplate)
      : await armService.createDeploymentFromType(this.config.provider.type || "consumption");

    await armService.deployTemplate(deployment);

    // Return function app
    return await this.get();
  }

  public async uploadZippedArfifactToFunctionApp(functionApp: Site, functionZipFile: string) {
    const scmDomain = this.getScmDomain(functionApp);

    this.log(`Deploying zip file to function app: ${functionApp.name}`);

    if (!(functionZipFile && fs.existsSync(functionZipFile))) {
      throw new Error("No zip file found for function app");
    }

    this.log(`-> Deploying service package @ ${functionZipFile}`);

    // https://github.com/projectkudu/kudu/wiki/Deploying-from-a-zip-file-or-url
    const requestOptions = {
      method: "POST",
      uri: `https://${scmDomain}/api/zipdeploy/`,
      json: true,
      headers: {
        Authorization: `Bearer ${this.getAccessToken()}`,
        Accept: "*/*",
        ContentType: "application/octet-stream",
      }
    };

    await this.sendFile(requestOptions, functionZipFile);
    this.log("-> Function package uploaded successfully");
  }

  /**
   * Gets local path of packaged function app
   */
  public getFunctionZipFile(): string {
    let functionZipFile = this.getOption("package") || this.serverless.service["artifact"];
    if (!functionZipFile) {
      functionZipFile = path.join(this.serverless.config.servicePath, ".serverless", `${this.serverless.service.getServiceName()}.zip`);
    }
    return functionZipFile;
  }

  /**
   * Uploads artifact file to blob storage container
   */
  private async uploadZippedArtifactToBlobStorage(functionZipFile: string) {
    await this.blobService.initialize();
    await this.blobService.createContainerIfNotExists(this.deploymentConfig.container);
    await this.blobService.uploadFile(
      functionZipFile,
      this.deploymentConfig.container,
      this.getArtifactName(this.deploymentName),
    );
  }

  /**
   * Get rollback-configured artifact name. Contains `-t{timestamp}`
   * if rollback is configured
   */
  public getArtifactName(deploymentName: string): string {
    return `${deploymentName.replace("rg-deployment", "artifact")}.zip`;
  }

  public getFunctionHttpTriggerConfig(functionApp: Site, functionConfig: FunctionEnvelope): FunctionAppHttpTriggerConfig {
    const httpTrigger = functionConfig.config.bindings.find((binding) => {
      return binding.type === "httpTrigger";
    });

    if (!httpTrigger) {
      return;
    }

    const route = httpTrigger.route || functionConfig.name;
    const url = `${functionApp.defaultHostName}/api/${route}`;

    return {
      authLevel: httpTrigger.authLevel,
      methods: httpTrigger.methods || ["*"],
      url: url,
      route: httpTrigger.route,
      name: functionConfig.name,
    };
  }

  /**
   * Gets a short lived admin token used to retrieve function keys
   */
  private async getAuthKey(functionApp: Site) {
    const adminTokenUrl = `${this.baseUrl}${functionApp.id}/functions/admin/token?api-version=2016-08-01`;
    const response = await this.sendApiRequest("GET", adminTokenUrl);

    return response.data.replace(/"/g, "");
  }

  /**
   * Retrieves the SCM domain from the list of enabled domains within the app
   * Note: The SCM domain exposes additional API calls from the standard REST APIs.
   * @param functionApp The function app / web site
   */
  private getScmDomain(functionApp: Site) {
    return functionApp.enabledHostNames.find((hostName: string) => {
      return hostName.includes(".scm.") && hostName.endsWith(".azurewebsites.net");
    });
  }
}
