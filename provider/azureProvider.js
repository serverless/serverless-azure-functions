'use strict';

const BbPromise = require('bluebird');
const _ = require('lodash');
const resourceManagement = require('azure-arm-resource');
const path = require('path');
const fs = require('fs');
const request = require('request');
const dns = require('dns');
const jsonpath = require('jsonpath');
const parseBindings = require('../shared/parseBindings');
const { login } = require('az-login');
const config = require('../config');

const pkg = require('../package.json');

let resourceGroupName;
let deploymentName;
let functionAppName;
let subscriptionId;
let functionsAdminKey;
let invocationId;
let principalCredentials;
let existingFunctionApp = false;
const deployedFunctionNames = [];

class AzureProvider {
  static getProviderName () {
    return config.providerName;
  }

  constructor (serverless) {
    this.provider = this;
    this.serverless = serverless;

    this.serverless.setProvider(config.providerName, this);
  }

  initialize(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    return new BbPromise((resolve) => {
      functionAppName = this.serverless.service.service;
      resourceGroupName = `${functionAppName}-rg`;
      deploymentName = `${resourceGroupName}-deployment`;

      resolve();
    });
  }

  getParsedBindings () {
    if (!this.parsedBindings) {
      this.parsedBindings = parseBindings.getBindingsMetaData(this.serverless);
    }

    return this.parsedBindings;
  }

  Login() {
    return login({ interactiveLoginHandler: (code, message) => {
      // Override the interactive login handler, in order to be
      // able to append the Serverless prefix to the displayed message.
      this.serverless.cli.log(message);
    }}).then((result) => {
      principalCredentials = result.credentials;
      subscriptionId = result.subscriptionId;

      return principalCredentials;
    }).catch((error) => {
      error.message = error.message || (error.body ? error.body.message : 'Failed logging in to Azure');
      throw error;
    });
  }

  CreateResourceGroup () {
    const groupParameters = {
      location: this.serverless.service.provider.location,
      tags: { sampletag: 'sampleValue' }
    };

    this.serverless.cli.log(`Creating resource group: ${resourceGroupName}`);
    const resourceClient = new resourceManagement.ResourceManagementClient(principalCredentials, subscriptionId);
    resourceClient.addUserAgentInfo(`${pkg.name}/${pkg.version}`);

    return new BbPromise((resolve, reject) => {
      resourceClient.resourceGroups.createOrUpdate(resourceGroupName,
        groupParameters, (error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
    });
  }

  CreateFunctionApp () {
    this.serverless.cli.log(`Creating function app: ${functionAppName}`);
    const resourceClient = new resourceManagement.ResourceManagementClient(principalCredentials, subscriptionId);
    let parameters = { functionAppName: { value: functionAppName } };
    resourceClient.addUserAgentInfo(`${pkg.name}/${pkg.version}`);

    const gitUrl = this.serverless.service.provider.gitUrl;

    if (gitUrl) {
      parameters = {
        functionAppName: { value: functionAppName },
        gitUrl: { value: gitUrl }
      };
    }

    let templateFilePath = path.join(__dirname, 'armTemplates', 'azuredeploy.json');

    if (gitUrl) {
      templateFilePath = path.join(__dirname, 'armTemplates', 'azuredeployWithGit.json');
    }
    if (this.serverless.service.provider.armTemplate) {
      templateFilePath = path.join(this.serverless.config.servicePath, this.serverless.service.provider.armTemplate.file);
      const userParameters = this.serverless.service.provider.armTemplate.parameters;
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
    const environmentVariables = this.serverless.service.provider.environment;
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

    const deploymentParameters = {
      properties: {
        mode: 'Incremental',
        parameters,
        template
      }
    };

    return new BbPromise((resolve, reject) => {
      resourceClient.deployments.createOrUpdate(resourceGroupName,
        deploymentName,
        deploymentParameters, (error, result) => {
          if (error) return reject(error);

          this.serverless.cli.log('Waiting for Kudu endpoint...');

          setTimeout(() => {
            resolve(result);
          }, 10000);
        });
    });
  }

  DeleteDeployment () {
    this.serverless.cli.log(`Deleting deployment: ${deploymentName}`);
    const resourceClient = new resourceManagement.ResourceManagementClient(principalCredentials, subscriptionId);
    resourceClient.addUserAgentInfo(`${pkg.name}/${pkg.version}`);

    return new BbPromise((resolve, reject) => {
      resourceClient.deployments.deleteMethod(resourceGroupName,
        deploymentName, (error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
    });
  }

  DeleteResourceGroup () {
    this.serverless.cli.log(`Deleting resource group: ${resourceGroupName}`);
    const resourceClient = new resourceManagement.ResourceManagementClient(principalCredentials, subscriptionId);
    resourceClient.addUserAgentInfo(`${pkg.name}/${pkg.version}`);

    return new BbPromise((resolve, reject) => {
      resourceClient.resourceGroups.deleteMethod(resourceGroupName, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  getAdminKey () {
    const options = {
      url: `https://${functionAppName}${config.scmDomain}${config.masterKeyApiPath}`,
      json: true,
      headers: {
        Authorization: config.bearer + principalCredentials.tokenCache._entries[0].accessToken
      }
    };

    return new BbPromise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(body);

        functionsAdminKey = body.masterKey;

        resolve(body.masterKey);
      });
    });
  }

  pingHostStatus (functionName) {
    const requestUrl = `https://${functionAppName}${config.functionAppDomain}/admin/functions/${functionName}/status`;
    const options = {
      host: functionAppName + config.functionAppDomain,
      method: 'get',
      url: requestUrl,
      json: true,
      headers: {
        'x-functions-key': functionsAdminKey,
        Accept: 'application/json,*/*'
      }
    };

    return new BbPromise((resolve, reject) => {
      this.serverless.cli.log('Pinging host status...');
      request(options, (err, res, body) => {
        if (err) return reject(err);
        if (body && body.Error) return reject(body.Error);

        if (res.statusCode !== 200) {
          return body && body.Error ? reject(body.Error) : reject(body);
        }

        resolve(res);
      });
    });
  }

  isExistingFunctionApp () {
    const host = functionAppName + config.scmDomain;

    return new BbPromise((resolve, reject) => {
      dns.resolve4(host, (err) => {
        if (err) {
          if (err.message.includes('ENOTFOUND')) {
            resolve(existingFunctionApp);
          } else {
            reject(err);
          }
        } else {
          existingFunctionApp = true;
          resolve(existingFunctionApp);
        }
      });
    });
  }

  getDeployedFunctionsNames () {
    const requestUrl = `https://${functionAppName}${config.scmDomain}${config.functionsApiPath}`;
    const options = {
      host: functionAppName + config.scmDomain,
      method: 'get',
      url: requestUrl,
      json: true,
      headers: {
        Authorization: config.bearer + principalCredentials.tokenCache._entries[0].accessToken,
        Accept: 'application/json,*/*'
      }
    };

    return new BbPromise((resolve, reject) => {
      if (existingFunctionApp) {
        this.serverless.cli.log('Looking for deployed functions that are not part of the current deployment...');
        request(options, (err, res, body) => {
          if (err) {
            if (err.message.includes('ENOTFOUND')) {
              resolve(res);
            } else {
              reject(err);
            }
          } else {
            if (res.statusCode === 200) {

              for (let functionNamesIndex = 0; functionNamesIndex < body.length; functionNamesIndex++) {
                deployedFunctionNames.push(body[functionNamesIndex].name);
              }
            }
            resolve(res);
          }
        });
      } else {
        resolve('New service...');
      }
    });
  }

  getLogsStream (functionName) {
    const logOptions = {
      url: `https://${functionAppName}${config.scmDomain}${config.logStreamApiPath}${functionName}`,
      headers: {
        Authorization: config.bearer + principalCredentials.tokenCache._entries[0].accessToken,
        Accept: '*/*'
      }
    };

    request
      .get(logOptions)
      .on('error', () => {
        console.error('Disconnected from log streaming.');
      })
      .on('end', this.getLogsStream.bind(this))
      .pipe(process.stdout);
  }

  getInvocationId (functionName) {
    const options = {
      url: `https://${functionAppName}${config.scmDomain}${config.logInvocationsApiPath + functionAppName}-${functionName}/invocations?limit=5`,
      method: 'GET',
      json: true,
      headers: {
        Authorization: config.bearer + principalCredentials.tokenCache._entries[0].accessToken
      }
    };

    return new BbPromise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(body);

        invocationId = body.entries[0].id;

        resolve(body.entries[0].id);
      });
    });
  }

  getLogsForInvocationId () {
    this.serverless.cli.log(`Logs for InvocationId: ${invocationId}`);
    const options = {
      url: `https://${functionAppName}${config.scmDomain}${config.logOutputApiPath}${invocationId}`,
      method: 'GET',
      json: true,
      headers: {
        Authorization: config.bearer + principalCredentials.tokenCache._entries[0].accessToken
      }
    };

    return new BbPromise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(body);

        resolve(body);
      });
    });
  }

  invoke (functionName, eventType, eventData) {
    if (eventType === 'http') {
      let queryString = '';

      if (eventData) {
        if (typeof eventData === 'string') {
          try {
            eventData = JSON.parse(eventData);
          }
          catch (error) {
            return BbPromise.reject('The specified input data isn\'t a valid JSON string. ' +
                                    'Please correct it and try invoking the function again.');
          }
        }

        queryString = Object.keys(eventData)
                            .map((key) => `${key}=${eventData[key]}`)
                            .join('&');
      }

      return new BbPromise((resolve, reject) => {
        const options = {
          headers: {
            'x-functions-key': functionsAdminKey
          },
          url: `http://${functionAppName}${config.functionAppDomain}${config.functionAppApiPath + functionName}?${queryString}`,
          method: 'GET',
          json: true,
        };

        this.serverless.cli.log(`Invoking function "${functionName}"`);
        request(options, (err, response, body) => {
          if (err) return reject(err);
          if (response.statusCode !== 200) return reject(body);

          console.log(body);

          resolve(body);
        });
      });
    }

    const requestUrl = `https://${functionAppName}${config.functionsAdminApiPath}${functionName}`;

    const options = {
      host: config.functionAppDomain,
      method: 'post',
      body: eventData,
      url: requestUrl,
      json: true,
      headers: {
        'x-functions-key': functionsAdminKey,
        Accept: 'application/json,*/*'
      }
    };

    return new BbPromise((resolve, reject) => {
      request(options, (err, res) => {
        if (err) {
          reject(err);
        }
        this.serverless.cli.log(`Invoked function at: ${requestUrl}. \nResponse statuscode: ${res.statusCode}`);
        resolve(res);
      });
    });
  }

  syncTriggers () {
    const requestUrl = [
      `https://management.azure.com/subscriptions/${subscriptionId}`,
      `/resourceGroups/${resourceGroupName}/providers/Microsoft.Web/sites/`,
      `${functionAppName}/functions/synctriggers?api-version=2015-08-01`
    ].join('');
    const options = {
      host: 'management.azure.com',
      method: 'post',
      body: {},
      url: requestUrl,
      json: true,
      headers: {
        Authorization: config.bearer + principalCredentials.tokenCache._entries[0].accessToken,
        'Accept': 'application/json,*/*'
      }
    };

    return new BbPromise((resolve, reject) => {
      request(options, (err, res) => {
        if (err) {
          reject(err);
        }
        this.serverless.cli.log(`Syncing Triggers....Response statuscode: ${res.statusCode}`);
        resolve(res);
      });
    });

  }

  runKuduCommand (command) {
    this.serverless.cli.log(`Running Kudu command ${command}...`);
    const requestUrl = `https://${functionAppName}${config.scmDomain}${config.scmCommandApiPath}`;
    let postBody = {
      command: command,
      dir: 'site\\wwwroot'
    };
    let options = {
      host: functionAppName + config.scmDomain,
      method: 'post',
      body: postBody,
      url: requestUrl,
      json: true,
      headers: {
        Authorization: config.bearer + principalCredentials.tokenCache._entries[0].accessToken,
        Accept: 'application/json'
      }
    };

    return new BbPromise((resolve, reject) => {
      request(options, (err, res, body) => {
        if (err) return reject(err);

        //
        // TODO: There is a case where the body will contain an error, but it's
        //    not actually an error. These are warnings from npm install.
        //

        if (res.statusCode !== 200) {
          return body && body.Error ? reject(body.Error) : reject('Error executing command, try again later.');
        }

        resolve(res);
      });
    });
  }

  cleanUpFunctionsBeforeDeploy (serverlessFunctions) {
    const deleteFunctionPromises = [];

    deployedFunctionNames.forEach((functionName) => {
      if (serverlessFunctions.indexOf(functionName) < 0) {
        this.serverless.cli.log(`Deleting function : ${functionName}`);
        deleteFunctionPromises.push(this.deleteFunction(functionName));
      }
    });

    return BbPromise.all(deleteFunctionPromises);
  }

  deleteFunction(functionName) {
    const requestUrl = `https://${functionAppName}${config.scmVfsPath}${functionName}/?recursive=true`;
    const options = {
      host: functionAppName + config.scmDomain,
      method: 'delete',
      url: requestUrl,
      json: true,
      headers: {
        Authorization: config.bearer + principalCredentials.tokenCache._entries[0].accessToken,
        Accept: '*/*'
      }
    };

    return new BbPromise((resolve, reject) => {
      request(options, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  uploadPackageJson () {
    const packageJsonFilePath = path.join(this.serverless.config.servicePath, 'package.json');
    this.serverless.cli.log('Uploading package.json...');

    const requestUrl = `https://${functionAppName}${config.scmVfsPath}package.json`;
    const options = {
      host: functionAppName + config.scmDomain,
      method: 'put',
      url: requestUrl,
      json: true,
      headers: {
        Authorization: config.bearer + principalCredentials.tokenCache._entries[0].accessToken,
        Accept: '*/*'
      }
    };

    return new BbPromise((resolve, reject) => {
      if (fs.existsSync(packageJsonFilePath)) {
        fs.createReadStream(packageJsonFilePath)
        .pipe(request.put(options, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve('Package.json file uploaded');
          }
        }));
      }
      else {
        resolve('Package.json file does not exist');
      }
    });
  }

  createEventsBindings(functionName, entryPoint, filePath, params) {
    return new BbPromise((resolve) => {
      const functionJSON = params.functionsJson;
      functionJSON.entryPoint = entryPoint;
      functionJSON.scriptFile = filePath;
      fs.writeFileSync(path.join(this.serverless.config.servicePath, functionName+'-function.json'), JSON.stringify(functionJSON, null, 4));
      resolve();
    });
  }

  uploadFunction (functionName) {
    return new BbPromise((resolve, reject) => {
      this.serverless.cli.log(`Uploading function: ${functionName}`);

      var functionZipFile = '';

      if (this.serverless.service.functions[functionName].package.artifact) {
        functionZipFile = this.serverless.service.functions[functionName].package.artifact;
      } else if (this.serverless.service.artifact) {
        functionZipFile = this.serverless.service.artifact;
      } else {
        reject('Could not find zip package');
      }

      const requestUrl = `https://${functionAppName}${config.scmZipApiPath}/${functionName}/`;
      const options = {
        url: requestUrl,
        headers: {
          Authorization: config.bearer + principalCredentials.tokenCache._entries[0].accessToken,
          Accept: '*/*'
        }
      };

      fs.createReadStream(functionZipFile)
        .pipe(request.put(options, (uploadZipErr, uploadZipResponse) => {
          if (uploadZipErr) {
            reject(uploadZipErr);
          } else {
            resolve(uploadZipResponse);
          }
        }));
    });
  }
}

module.exports = AzureProvider;
