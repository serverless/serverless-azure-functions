import { WebSiteManagementClient } from '@azure/arm-appservice';
import { ResourceManagementClient } from '@azure/arm-resources';
import { Deployment } from '@azure/arm-resources/esm/models';
import * as fs from 'fs';
import jsonpath from 'jsonpath';
import * as _ from 'lodash';
import * as path from 'path';
import * as Serverless from 'serverless';
import { BaseService } from './baseService';
import * as request from 'request';

export class FunctionAppService extends BaseService {
  private resourceClient: ResourceManagementClient;
  private webClient: WebSiteManagementClient;

  constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);

    this.resourceClient = new ResourceManagementClient(this.credentials, this.subscriptionId);
    this.webClient = new WebSiteManagementClient(this.credentials, this.subscriptionId);
  }

  async get() {
    const response: any = await this.webClient.webApps.get(this.resourceGroup, this.serviceName);
    if (response.error && (response.error.code === 'ResourceNotFound' || response.error.code === 'ResourceGroupNotFound')) {
      return null;
    }

    return response;
  }

  async getMasterKey(functionApp) {
    functionApp = functionApp || await this.get();
    const adminToken = await this._getAuthKey(functionApp);

    return await this._getMasterKey(functionApp.defaultHostName, adminToken);
  }

  async deleteFunction(functionName) {
    this.serverless.cli.log(`-> Deleting function: ${functionName}`);
    return await this.webClient.webApps.deleteFunction(this.resourceGroup, this.serviceName, functionName);
  }

  async syncTriggers(functionApp) {
    this.serverless.cli.log('Syncing function triggers');

    const syncTriggersUrl = `${this.baseUrl}${functionApp.id}/syncfunctiontriggers?api-version=2016-08-01`;
    await this.sendApiRequest('POST', syncTriggersUrl);
  }

  async cleanUp(functionApp) {
    this.serverless.cli.log('Cleaning up existing functions');
    const deleteTasks = [];

    const serviceFunctions = this.serverless.service.getAllFunctions();
    const deployedFunctions = await this.listFunctions(functionApp);

    deployedFunctions.forEach((func) => {
      if (serviceFunctions.includes(func.name)) {
        this.serverless.cli.log(`-> Deleting function '${func.name}'`);
        deleteTasks.push(this.deleteFunction(func.name));
      }
    });

    return await Promise.all(deleteTasks);
  }

  async listFunctions(functionApp) {
    const getTokenUrl = `${this.baseUrl}${functionApp.id}/functions?api-version=2016-08-01`;
    const response = await this.sendApiRequest('GET', getTokenUrl);

    return response.data.value || [];
  }

  async uploadFunctions(functionApp) {
    this.serverless.cli.log('Creating azure functions');

    // Perform additional operations per function
    const serviceFunctions = this.serverless.service.getAllFunctions();
    const uploadTasks = serviceFunctions.map((functionName) => this.uploadFunction(functionApp, functionName));

    return await Promise.all(uploadTasks);
  }

  async uploadFunction(functionApp, functionName) {
    this.serverless.cli.log(`-> Creating function: ${functionName}`);

    const scmDomain = functionApp.enabledHostNames[0];

    // Upload function artifact if it exists, otherwise the full service is handled in 'uploadFunctions' method
    const functionZipFile = this.serverless.service['functions'][functionName].package.artifact || this.serverless.service['artifact'];
    if (functionZipFile) {
      this.serverless.cli.log(`-> Uploading function package: ${functionName}`);

      const requestOptions = {
        method: 'PUT',
        uri: `https://${scmDomain}/api/zip/site/wwwroot/${functionName}/`,
        json: true,
        headers: {
          Authorization: `Bearer ${this.credentials.tokenCache._entries[0].accessToken}`,
          Accept: '*/*'
        }
      };

      await this._sendFile(requestOptions, functionZipFile);
      this.serverless.cli.log(`-> Function package uploaded successfully: ${functionName}`);

      // Rename function json
      const fromPath = path.join(functionName, `${functionName}-function.json`);
      const toPath = path.join(functionName, 'function.json');
      const command = `mv ${fromPath} ${toPath}`;
      await this._runKuduCommand(functionApp, command);
    }
  }

  async deploy() {
    this.serverless.cli.log(`Creating function app: ${this.serviceName}`);
    let parameters: any = { functionAppName: { value: this.serviceName } };

    const gitUrl = this.serverless.service.provider['gitUrl'];

    if (gitUrl) {
      parameters = {
        functionAppName: { value: this.serviceName },
        gitUrl: { value: gitUrl }
      };
    }

    let templateFilePath = path.join(__dirname, '..', 'provider', 'armTemplates', 'azuredeploy.json');

    if (gitUrl) {
      templateFilePath = path.join(__dirname, 'armTemplates', 'azuredeployWithGit.json');
    }

    if (this.serverless.service.provider['armTemplate']) {
      this.serverless.cli.log(`-> Deploying custom ARM template: ${this.serverless.service.provider['armTemplate'].file}`);
      templateFilePath = path.join(this.serverless.config.servicePath, this.serverless.service.provider['armTemplate'].file);
      const userParameters = this.serverless.service.provider['armTemplate'].parameters;
      const userParametersKeys = Object.keys(userParameters);

      for (let paramIndex = 0; paramIndex < userParametersKeys.length; paramIndex++) {
        const item = {};

        item[userParametersKeys[paramIndex]] = { 'value': userParameters[userParametersKeys[paramIndex]] };
        parameters = _.merge(parameters, item);
      }
    }

    let template = JSON.parse(fs.readFileSync(templateFilePath, 'utf8'));

    // Check if there are custom environment variables defined that need to be
    // added to the ARM template used in the deployment.
    const environmentVariables = this.serverless.service.provider['environment'];
    if (environmentVariables) {
      const appSettingsPath = '$.resources[?(@.kind=="functionapp")].properties.siteConfig.appSettings';

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
        mode: 'Incremental',
        parameters,
        template
      }
    };

    // Deploy ARM template
    await this.resourceClient.deployments.createOrUpdate(this.resourceGroup, this.deploymentName, deploymentParameters);

    // Return function app 
    return await this.get();
  }

  /**
   * Uploads the specified file via HTTP request
   * @param requestOptions The HTTP request options
   * @param filePath The local file path
   */
  _sendFile(requestOptions, filePath) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(request(requestOptions, (err, response) => {
          if (err) {
            this.serverless.cli.log(JSON.stringify(err, null, 4));
            return reject(err);
          }
          resolve(response);
        }));
    });
  }

  _wait(timeout) {
    return new Promise((resolve) => setTimeout(resolve, timeout));
  }

  _waitForCondition(predicate, interval = 2000) {
    return new Promise((resolve, reject) => {
      let retries = 0;
      const id = setInterval(async () => {
        if (retries >= 20) {
          clearInterval(id);
          return reject('Failed conditional check 20 times');
        }

        retries++;
        const result = await predicate();
        if (result) {
          clearInterval(id);
          resolve(result);
        }
      }, interval);
    });
  }

  async _runKuduCommand(functionApp, command) {
    this.serverless.cli.log(`-> Running Kudu command ${command}...`);

    const scmDomain = functionApp.enabledHostNames[0];
    const requestUrl = `https://${scmDomain}/api/command`;

    // TODO: There is a case where the body will contain an error, but it's
    // not actually an error. These are warnings from npm install.
    const response = await this.sendApiRequest('POST', requestUrl, {
      data: {
        command: command,
        dir: 'site\\wwwroot'
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
  async _getAuthKey(functionApp) {
    const adminTokenUrl = `${this.baseUrl}${functionApp.id}/functions/admin/token?api-version=2016-08-01`;
    const response = await this.sendApiRequest('GET', adminTokenUrl);

    return response.data.replace(/"/g, '');
  }

  /**
   * Gets the master key for the specified function app
   * @param functionAppUrl The function app url
   * @param authToken The JWT access token used for authorization
   */
  async _getMasterKey(functionAppUrl, authToken) {
    const keyUrl = `https://${functionAppUrl}/admin/host/systemkeys/_master`;

    const response = await this.sendApiRequest('GET', keyUrl, {
      json: true,
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    return response.data.value;
  }
}
