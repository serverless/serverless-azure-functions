import fs from "fs";
import path from "path";
import { WebSiteManagementClient } from "@azure/arm-appservice";
import { ResourceManagementClient } from "@azure/arm-resources";
import { Deployment } from "@azure/arm-resources/esm/models";
import jsonpath from "jsonpath";
import _ from "lodash";
import Serverless from "serverless";
import { BaseService } from "./baseService";
import { constants } from "../config";

export class FunctionAppService extends BaseService {
  private resourceClient: ResourceManagementClient;
  private webClient: WebSiteManagementClient;

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);

    this.resourceClient = new ResourceManagementClient(this.credentials, this.subscriptionId);
    this.webClient = new WebSiteManagementClient(this.credentials, this.subscriptionId);
  }

  public async get() {
    const response: any = await this.webClient.webApps.get(this.resourceGroup, this.serviceName);
    if (response.error && (response.error.code === "ResourceNotFound" || response.error.code === "ResourceGroupNotFound")) {
      return null;
    }

    return response;
  }

  public async getMasterKey(functionApp?) {
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

  public async deleteFunction(functionName) {
    this.log(`-> Deleting function: '${functionName}'`);
    return await this.webClient.webApps.deleteFunction(this.resourceGroup, this.serviceName, functionName);
  }

  public async syncTriggers(functionApp) {
    this.log("Syncing function triggers");

    const syncTriggersUrl = `${this.baseUrl}${functionApp.id}/syncfunctiontriggers?api-version=2016-08-01`;
    return await this.sendApiRequest("POST", syncTriggersUrl);
  }

  public async cleanUp(functionApp) {
    this.log("Cleaning up existing functions");
    const deleteTasks = [];

    const serviceFunctions = this.serverless.service.getAllFunctions();
    const deployedFunctions = await this.listFunctions(functionApp);

    deployedFunctions.forEach((func) => {
      if (serviceFunctions.includes(func.name)) {
        deleteTasks.push(this.deleteFunction(func.name));
      }
    });

    return await Promise.all(deleteTasks);
  }

  public async listFunctions(functionApp) {
    const getTokenUrl = `${this.baseUrl}${functionApp.id}/functions?api-version=2016-08-01`;
    const response = await this.sendApiRequest("GET", getTokenUrl);

    return response.data.value || [];
  }

  public async uploadFunctions(functionApp) {
    await this.zipDeploy(functionApp);
  }

  private async zipDeploy(functionApp) {
    const functionAppName = functionApp.name;
    this.log(`Deploying zip file to function app: ${functionAppName}`);

    // Upload function artifact if it exists, otherwise the full service is handled in 'uploadFunctions' method
    const functionZipFile = this.serverless.service["artifact"];
    if (!functionZipFile) {
      throw new Error("No zip file found for function app");
    }

    this.log(`-> Uploading ${functionZipFile}`);

    const uploadUrl = `https://${functionAppName}${constants.scmDomain}${constants.scmZipDeployApiPath}`;
    this.log(`-> Upload url: ${uploadUrl}`);

    // https://github.com/projectkudu/kudu/wiki/Deploying-from-a-zip-file-or-url
    const requestOptions = {
      method: "POST",
      uri: uploadUrl,
      json: true,
      headers: {
        Authorization: `Bearer ${this.credentials.tokenCache._entries[0].accessToken}`,
        Accept: "*/*",
        ContentType: "application/octet-stream",
      }
    };

    try {
      await this.sendFile(requestOptions, functionZipFile);
      this.log("-> Function package uploaded successfully");
    } catch (e) {
      throw new Error(`Error uploading zip file:\n  --> ${e}`);
    }
  }

  /**
   * create all necessary resources as defined in src/provider/armTemplates
   *    resource-group, storage account, app service plan, and app service at the minimum
   */
  public async deploy() {
    this.log(`Creating function app: ${this.serviceName}`);
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
      this.log(`-> Deploying custom ARM template: ${this.serverless.service.provider["armTemplate"].file}`);
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

  private async runKuduCommand(functionApp, command) {
    this.log(`-> Running Kudu command ${command}...`);

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
  private async getAuthKey(functionApp) {
    const adminTokenUrl = `${this.baseUrl}${functionApp.id}/functions/admin/token?api-version=2016-08-01`;
    const response = await this.sendApiRequest("GET", adminTokenUrl);

    return response.data.replace(/"/g, "");
  }
}
