import { WebSiteManagementClient } from "@azure/arm-appservice";
import { FunctionEnvelope, Site } from "@azure/arm-appservice/esm/models";
import fs from "fs";
import path from "path";
import Serverless from "serverless";
import { FunctionAppResource } from "../armTemplates/resources/functionApp";
import { ArmDeployment } from "../models/armTemplates";
import { FunctionAppHttpTriggerConfig } from "../models/functionApp";
import { Guard } from "../shared/guard";
import { Utils } from "../shared/utils";
import { ArmService } from "./armService";
import { AzureBlobStorageService } from "./azureBlobStorageService";
import { BaseService } from "./baseService";
import { constants } from "../shared/constants";
import { FunctionAppOS } from "../config/runtime";
const packageJson = require("../../package.json"); // eslint-disable-line @typescript-eslint/no-var-requires

export class FunctionAppService extends BaseService {
  private static readonly retryCount: number = 30;
  private static readonly retryInterval: number = 30000;
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
      this.log(this.resourceGroup);
      this.log(FunctionAppResource.getResourceName(this.config));
      this.log(JSON.stringify(response));
      return null;
    }

    return response;
  }

  public async getMasterKey(functionApp?: Site) {
    functionApp = functionApp || await this.get();
    const keyUrl = `${this.baseUrl}${functionApp.id}/host/default/listkeys?api-version=2019-08-01`;
    const response = await this.sendApiRequest("POST", keyUrl);

    return response.data.masterKey;
  }

  public async deleteFunction(functionApp: Site, functionName: string) {
    Guard.null(functionApp);
    Guard.empty(functionName);

    this.log(`-> Deleting function: ${functionName}`);
    const deleteFunctionUrl = `${this.baseUrl}${functionApp.id}/functions/${functionName}?api-version=2016-08-01`;

    return await this.sendApiRequest("DELETE", deleteFunctionUrl);
  }

  public async syncTriggers(functionApp: Site, properties: { [propertyName: string]: string }) {
    Guard.null(functionApp);

    this.log("Syncing function triggers");

    const syncTriggersUrl = `${this.baseUrl}/subscriptions/${this.subscriptionId}` +
      `/resourceGroups/${this.resourceGroup}/providers/Microsoft.Web/sites/${functionApp.name}` +
      "/syncfunctiontriggers?api-version=2016-08-01";

    try {
      return await this.sendApiRequest("POST", syncTriggersUrl, { data: { properties } });
    } catch (err) {
      throw new Error(`Error syncing function app triggers: ${err}`)
    }
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
    let retries = 0;
    try {
      const response = await Utils.runWithRetry(async () => {
        const listFunctionsResponse = await this.sendApiRequest("GET", getTokenUrl);

        if (listFunctionsResponse.status !== 200 || listFunctionsResponse.data.value.length === 0) {
          this.log(`-> Function App not ready. Retry ${retries++} of ${FunctionAppService.retryCount}...`);
          const response = this.stringify(listFunctionsResponse.data);
          throw new Error(
            `The function app is taking longer than usual to be provisioned. Please try again soon.
            Response error data: \n${response}`
          );
        }

        return listFunctionsResponse;
      }, FunctionAppService.retryCount, FunctionAppService.retryInterval);

      return response.data.value.map((functionConfig) => functionConfig.properties);
    }
    catch (e) {
      this.log("-> Unable to retrieve function app list");
      throw e;
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
          throw new Error(this.stringify(response.data));
        }

        return getFunctionResponse;
      }, FunctionAppService.retryCount, FunctionAppService.retryInterval);

      return response.data.properties;
    } catch (e) {
      return null;
    }
  }

  public async uploadFunctions(functionApp: Site): Promise<any> {
    Guard.null(functionApp, "functionApp");
    const functionZipFile = this.getFunctionZipFile();
    if (this.config.provider.deployment.external) {
      this.log("Updating function app setting to run from external package...");
      await this.uploadZippedArtifactToBlobStorage(functionZipFile);

      const sasUrl = await this.blobService.generateBlobSasTokenUrl(
        this.config.provider.deployment.container,
        this.artifactName
      );

      const response = await this.updateFunctionAppSetting(
        functionApp,
        constants.runFromPackageSetting,
        sasUrl
      );
      await this.syncTriggers(functionApp, response.properties);
      await this.logFunctions(functionApp);
    } else {
      await Promise.all([
        // Uploaded to blob storage as artifact for future reference
        this.uploadZippedArtifactToBlobStorage(functionZipFile),
        this.publish(functionApp, functionZipFile),
      ]);
    }
  }

  /**
   * create all necessary resources as defined in src/provider/armTemplates
   *    resource-group, storage account, app service plan, and app service at the minimum
   */
  public async deploy() {
    this.log(`Creating function app: ${FunctionAppResource.getResourceName(this.config)}`);

    const armService = new ArmService(this.serverless, this.options);
    const { armTemplate, type } = this.config.provider;
    const deployment: ArmDeployment = armTemplate
      ? await armService.createDeploymentFromConfig(armTemplate)
      : await armService.createDeploymentFromType(type || "consumption");

    await armService.deployTemplate(deployment);

    // Return function app
    return await this.get();
  }

  public async uploadZippedArtifactToFunctionApp(functionApp: Site, functionZipFile: string) {
    const scmDomain = this.getScmDomain(functionApp);

    this.log(`Deploying zip file to function app: ${functionApp.name}`);

    if (!(functionZipFile && fs.existsSync(functionZipFile))) {
      throw new Error("No zip file found for function app");
    }

    this.log(`-> Deploying service package @ ${functionZipFile}`);

    const isLinux = this.configService.getOs() === FunctionAppOS.LINUX;
    const uri = `https://${scmDomain}/api/zipdeploy${isLinux ? "?syncTriggers=true" : ""}`
    this.log("Publishing to URI: " + uri);

    // https://github.com/projectkudu/kudu/wiki/Deploying-from-a-zip-file-or-url
    const requestOptions = {
      method: "POST",
      uri,
      json: true,
      headers: {
        Authorization: `Bearer ${await this.getAccessToken()}`,
        Accept: "*/*",
        ContentType: "application/octet-stream",
        "User-Agent": `serverless_framework/${this.serverless.version} serverless_azure_functions/${packageJson.version}`, //TODO Underscore version name of plugin/cli
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

  public getDeploymentName(): string {
    return this.configService.getDeploymentName();
  }

  public async updateFunctionAppSetting(functionApp: Site, setting: string, value: string) {
    const { properties } = await this.webClient.webApps.listApplicationSettings(this.resourceGroup, functionApp.name);
    properties[setting] = value;
    try {
      const url = `${this.baseUrl}/subscriptions/${this.subscriptionId}/resourceGroups/${this.resourceGroup}` +
        `/providers/Microsoft.Web/sites/${functionApp.name}/config/appsettings?api-version=2016-08-01`;

      const response = await this.sendApiRequest("PUT", url, { data: { properties } });
      return response.data;
      // return await this.webClient.webApps.updateApplicationSettings(this.resourceGroup, functionApp.name, properties);
    } catch (err) {
      throw new Error(`Failed to update function app settings: ${err}`)
    }
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
   * Publish function app
   * @param functionApp Function App
   * @param functionZipFile Path to zipped function app file
   */
  private async publish(functionApp: Site, functionZipFile: string) {

    this.log("Deploying serverless functions...");
    await this.uploadZippedArtifactToFunctionApp(functionApp, functionZipFile);
    await this.logFunctions(functionApp);
  }

  private async logFunctions(functionApp: Site) {
    this.log("Deployed serverless functions:");
    const serverlessFunctions = this.serverless.service.getAllFunctions();
    const deployedFunctions = await this.listFunctions(functionApp);

    // List functions that are part of the serverless yaml config
    deployedFunctions.forEach((functionConfig) => {
      if (serverlessFunctions.includes(functionConfig.name)) {
        const httpConfig = this.getFunctionHttpTriggerConfig(functionApp, functionConfig);

        if (httpConfig) {
          const method = httpConfig.methods[0].toUpperCase();
          this.log(`-> ${functionConfig.name}: [${method}] ${httpConfig.url}`);
        }
      }
    });
  }

  /**
   * Uploads artifact file to blob storage container
   */
  private async uploadZippedArtifactToBlobStorage(functionZipFile: string): Promise<void> {
    await this.blobService.initialize();
    await this.blobService.createContainerIfNotExists(this.config.provider.deployment.container);
    await this.blobService.uploadFile(
      functionZipFile,
      this.config.provider.deployment.container,
      this.artifactName,
    );
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
