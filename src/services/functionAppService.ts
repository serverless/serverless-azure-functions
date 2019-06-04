import fs from "fs";
import path from "path";
import { WebSiteManagementClient } from "@azure/arm-appservice";
import { ResourceManagementClient } from "@azure/arm-resources";
import { Deployment } from "@azure/arm-resources/esm/models";
import jsonpath from "jsonpath";
import _ from "lodash";
import Serverless from "serverless";
import { BaseService } from "./baseService";
import { FunctionAppHttpTriggerConfig } from '../models/functionApp';
import { Site, FunctionEnvelope } from '@azure/arm-appservice/esm/models';

export class FunctionAppService extends BaseService {
  private resourceClient: ResourceManagementClient;
  private webClient: WebSiteManagementClient;

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);

    this.resourceClient = new ResourceManagementClient(this.credentials, this.subscriptionId);
    this.webClient = new WebSiteManagementClient(this.credentials, this.subscriptionId);
  }

  public async get(): Promise<Site> {
    const response: any = await this.webClient.webApps.get(this.resourceGroup, this.serviceName);
    if (response.error && (response.error.code === "ResourceNotFound" || response.error.code === "ResourceGroupNotFound")) {
      return null;
    }

    return response;
  }

  public async getMasterKey(functionApp) {
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
    this.serverless.cli.log(`-> Deleting function: ${functionName}`);
    const deleteFunctionUrl = `${this.baseUrl}${functionApp.id}/functions/${functionName}?api-version=2016-08-01`;

    return await this.sendApiRequest('DELETE', deleteFunctionUrl);
  }

  public async syncTriggers(functionApp: Site) {
    this.serverless.cli.log("Syncing function triggers");

    const syncTriggersUrl = `${this.baseUrl}${functionApp.id}/syncfunctiontriggers?api-version=2016-08-01`;
    await this.sendApiRequest("POST", syncTriggersUrl);
  }

  public async cleanUp(functionApp: Site) {
    this.serverless.cli.log("Cleaning up existing functions");
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
    const getTokenUrl = `${this.baseUrl}${functionApp.id}/functions?api-version=2016-08-01`;
    const response = await this.sendApiRequest("GET", getTokenUrl);

    if (response.status !== 200) {
      return [];
    }

    return response.data.value.map((functionConfig) => functionConfig.properties);
  }

  public async getFunction(functionApp: Site, functionName: string): Promise<FunctionEnvelope> {
    const getFunctionUrl = `${this.baseUrl}${functionApp.id}/functions/${functionName}?api-version=2016-08-01`;
    const response = await this.sendApiRequest('GET', getFunctionUrl);

    if (response.status !== 200) {
      return null;
    }

    return response.data.properties;
  }

  public async uploadFunctions(functionApp: Site): Promise<any> {
    await this.zipDeploy(functionApp);
  }

  /**
   * create all necessary resources as defined in src/provider/armTemplates
   *    resource-group, storage account, app service plan, and app service at the minimum
   */
  public async deploy() {
    this.serverless.cli.log(`Creating function app: ${this.serviceName}`);
    let parameters: any = { functionAppName: { value: this.serviceName } };

    const gitUrl = this.serverless.service.provider["gitUrl"];

    if (gitUrl) {
      parameters = {
        functionAppName: { value: this.serviceName },
        gitUrl: { value: gitUrl }
      };
    }

    let templateFilePath = path.join(__dirname, "..", "provider", "armTemplates", "azuredeploy.json");

    if (gitUrl) {
      templateFilePath = path.join(__dirname, "armTemplates", "azuredeployWithGit.json");
    }

    if (this.serverless.service.provider["armTemplate"]) {
      this.serverless.cli.log(`-> Deploying custom ARM template: ${this.serverless.service.provider["armTemplate"].file}`);
      templateFilePath = path.join(this.serverless.config.servicePath, this.serverless.service.provider["armTemplate"].file);
      const userParameters = this.serverless.service.provider["armTemplate"].parameters;
      const userParametersKeys = Object.keys(userParameters);

      for (let paramIndex = 0; paramIndex < userParametersKeys.length; paramIndex++) {
        const item = {};

        item[userParametersKeys[paramIndex]] = { "value": userParameters[userParametersKeys[paramIndex]] };
        parameters = _.merge(parameters, item);
      }
    }

    let template = JSON.parse(fs.readFileSync(templateFilePath, "utf8"));

    // Check if there are custom environment variables defined that need to be
    // added to the ARM template used in the deployment.
    const environmentVariables = this.serverless.service.provider["environment"];
    if (environmentVariables) {
      const appSettingsPath = "$.resources[?(@.kind==\"functionapp\")].properties.siteConfig.appSettings";

      jsonpath.apply(template, appSettingsPath, function (appSettingsList) {
        Object.keys(environmentVariables).forEach(function (key) {
          appSettingsList.push({
            name: key,
            value: environmentVariables[key]
          });
        });

        return appSettingsList;
      });
    }

    const deploymentParameters: Deployment = {
      properties: {
        mode: "Incremental",
        parameters,
        template
      }
    };

    // Deploy ARM template
    await this.resourceClient.deployments.createOrUpdate(this.resourceGroup, this.deploymentName, deploymentParameters);

    // Return function app 
    return await this.get();
  }

  private async zipDeploy(functionApp) {
    const functionAppName = functionApp.name;
    const scmDomain = functionApp.enabledHostNames[0];

    this.serverless.cli.log(`Deploying zip file to function app: ${functionAppName}`);

    // Upload function artifact if it exists, otherwise the full service is handled in 'uploadFunctions' method
    const functionZipFile = this.serverless.service["artifact"];
    if (!functionZipFile) {
      throw new Error("No zip file found for function app");
    }

    this.serverless.cli.log(`-> Deploying service package @ ${functionZipFile}`);

    // https://github.com/projectkudu/kudu/wiki/Deploying-from-a-zip-file-or-url
    const requestOptions = {
      method: "POST",
      uri: `https://${scmDomain}/api/zipdeploy/`,
      json: true,
      headers: {
        Authorization: `Bearer ${this.credentials.tokenCache._entries[0].accessToken}`,
        Accept: "*/*",
        ContentType: "application/octet-stream",
      }
    };

    await this.sendFile(requestOptions, functionZipFile);
    this.serverless.cli.log('-> Function package uploaded successfully');
    const serverlessFunctions = this.serverless.service.getAllFunctions();
    const deployedFunctions = await this.listFunctions(functionApp);

    this.serverless.cli.log('Deployed serverless functions:')
    deployedFunctions.forEach((functionConfig) => {
      // List functions that are part of the serverless yaml config
      if (serverlessFunctions.includes(functionConfig.name)) {
        const httpConfig = this.getFunctionHttpTriggerConfig(functionApp, functionConfig);

        if (httpConfig) {
          const method = httpConfig.methods[0].toUpperCase();
          this.serverless.cli.log(`-> ${functionConfig.name}: ${method} ${httpConfig.url}`);
        }
      }
    });
  }

  private getFunctionHttpTriggerConfig(functionApp: Site, functionConfig: FunctionEnvelope): FunctionAppHttpTriggerConfig {
    const httpTrigger = functionConfig.config.bindings.find((binding) => {
      return binding.type === 'httpTrigger';
    });

    if (!httpTrigger) {
      return;
    }

    const route = httpTrigger.route || functionConfig.name;
    const url = `${functionApp.defaultHostName}/api/${route}`;

    return {
      authLevel: httpTrigger.authLevel,
      methods: httpTrigger.methods || ['*'],
      url: url,
      route: httpTrigger.route,
      name: functionConfig.name,
    };
  }

  private async runKuduCommand(functionApp: Site, command: string) {
    this.serverless.cli.log(`-> Running Kudu command ${command}...`);

    const scmDomain = functionApp.enabledHostNames[0];
    const requestUrl = `https://${scmDomain}/api/command`;

    // TODO: There is a case where the body will contain an error, but it's
    // not actually an error. These are warnings from npm install.
    const response = await this.sendApiRequest("POST", requestUrl, {
      data: {
        command: command,
        dir: "site\\wwwroot"
      }
    });

    if (response.status !== 200) {
      if (response.data && response.data.Error) {
        throw new Error(response.data.Error);
      }
      throw new Error(`Error executing ${command} command, try again later.`);
    }
  }

  /**
   * Gets a short lived admin token used to retrieve function keys
   */
  private async getAuthKey(functionApp: Site) {
    const adminTokenUrl = `${this.baseUrl}${functionApp.id}/functions/admin/token?api-version=2016-08-01`;
    const response = await this.sendApiRequest("GET", adminTokenUrl);

    return response.data.replace(/"/g, "");
  }
}
