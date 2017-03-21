'use strict';

const BbPromise = require('bluebird');
const _ = require('lodash');
const msRestAzure = require('ms-rest-azure');
const resourceManagement = require('azure-arm-resource');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const https = require('https');
const JSZip = require('jszip');
const request = require('request');
const dns = require('dns');
const parseBindings = require('../shared/parseBindings');

let resourceGroupName;
let deploymentName;
let functionAppName;
let hostingPlanName;
let subscriptionId;
let servicePrincipalTenantId;
let servicePrincipalClientId;
let servicePrincipalPassword;
let functionsAdminKey;
let invocationId;
let oldLogs = '';
let principalCredentials;
let functionsFolder;
let existingFunctionApp = false;
let parsedBindings;
let isDefaultResourceGroup = true;
const zipArray = [];
const deployedFunctionNames = [];

const constants = {
  'authorizationHeader': 'Authorization',
  'bearer': 'Bearer ',
  'contentTypeHeader': 'Content-Type',
  'functionAppApiPath': '/api/',
  'functionAppDomain': '.azurewebsites.net',
  'functionsAdminApiPath': '.azurewebsites.net/admin/functions/',
  'functionsApiPath': '/api/functions',
  'jsonContentType': 'application/json',
  'logInvocationsApiPath': '/azurejobs/api/functions/definitions/',
  'logOutputApiPath': '/azurejobs/api/log/output/',
  'logStreamApiPath': '/api/logstream/application/functions/function/',
  'masterKeyApiApth': '/api/functions/admin/masterkey',
  'providerName': 'azure',
  'scmCommandApiPath': '/api/command',
  'scmDomain': '.scm.azurewebsites.net',
  'scmVfsPath': '.scm.azurewebsites.net/api/vfs/site/wwwroot/',
  'scmZipApiPath': '.scm.azurewebsites.net/api/zip/site/wwwroot/'
};

const azureCredentials = {
  'azureSubId': 'azureSubId',
  'azureServicePrincipalTenantId': 'azureServicePrincipalTenantId',
  'azureservicePrincipalClientId': 'azureservicePrincipalClientId',
  'azureServicePrincipalPassword': 'azureServicePrincipalPassword',
};

class AzureProvider {
  static getProviderName() {
    return constants.providerName;
  }

  constructor(serverless) {
    this.serverless = serverless;
    this.provider = this;
    this.serverless.setProvider(constants.providerName, this);
  }

  initialise(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    if(this.serverless.service.provider.credentials) {
      var credentials = this.serverless.service.provider.credentials;

      subscriptionId = credentials.azureSubId;
      servicePrincipalTenantId = credentials.azureServicePrincipalTenantId;
      servicePrincipalClientId = credentials.azureServicePrincipalClientId;
      servicePrincipalPassword = credentials.azureServicePrincipalPassword;
    }
    else {
      subscriptionId = this.getSetting(azureCredentials.azureSubId);
      servicePrincipalTenantId = this.getSetting(azureCredentials.azureServicePrincipalTenantId);
      servicePrincipalClientId = this.getSetting(azureCredentials.azureservicePrincipalClientId);
      servicePrincipalPassword = this.getSetting(azureCredentials.azureServicePrincipalPassword);
    }

    functionAppName = this.serverless.service.service;
    if(this.serverless.service.provider.functionAppName) {
        functionAppName = this.serverless.service.provider.functionAppName;
    }

    hostingPlanName = this.serverless.service.service + '-hosting';
    if(this.serverless.service.provider.hostingPlanName) {
      hostingPlanName = this.serverless.service.provider.hostingPlanName;
    }

    resourceGroupName = `${functionAppName}-rg`;
    if (this.serverless.service.provider.resourceGroup) {
      isDefaultResourceGroup = false;
      resourceGroupName = this.serverless.service.provider.resourceGroup;
    }

    deploymentName = `${resourceGroupName}-deployment`;
    functionsFolder = path.join(this.serverless.config.servicePath, 'functions');

    return this;
  }

  getParsedBindings() {
    if (!this.parsedBindings) {
      this.parsedBindings = parseBindings.getBindingsMetaData(this.serverless);
    }

    return this.parsedBindings;
  }

  getSetting(key) {
    // Loop through environment variables looking for the keys, case insentivie
    for (var k in process.env) {
      if (process.env.hasOwnProperty(k)) {
        if (k.toLowerCase() === key.toLowerCase()) {
          return process.env[k];
        }
      }
    }
  }

  LoginWithServicePrincipal() {
    return new BbPromise((resolve, reject) => {
      msRestAzure.loginWithServicePrincipalSecret(servicePrincipalClientId, servicePrincipalPassword, servicePrincipalTenantId, (error, credentials) => {
        if (error) {
          reject(error);
        } else {
          this.serverless.cli.log(`Received ServicePrincipal Credentials.`);

          principalCredentials = credentials;
          resolve(credentials);
        }
      });
    });
  }

  CreateResourceGroup() {
    const groupParameters = {
      'location': this.serverless.service.provider.location,
      'tags': { 'sampletag': 'sampleValue' }
    };

    this.serverless.cli.log(`Creating resource group: ${resourceGroupName}`);
    const resourceClient = new resourceManagement.ResourceManagementClient(principalCredentials, subscriptionId);

    return new BbPromise((resolve, reject) => {
      resourceClient.resourceGroups.createOrUpdate(resourceGroupName,
        groupParameters, (error, result, createOrUpdateRequest, response) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
    });
  }

  CreateFunctionApp(method, params) {
    this.serverless.cli.log(`Creating function app: ${functionAppName}`);
    const resourceClient = new resourceManagement.ResourceManagementClient(principalCredentials, subscriptionId);
    let parameters = { 'functionAppName': { 'value': functionAppName }, 'hostingPlanName': {'value':hostingPlanName} };

    const gitUrl = this.serverless.service.provider.gitUrl;

    if (gitUrl) {
      parameters = {
        'functionAppName': { 'value': functionAppName },
        'hostingPlanName' : { 'value' : hostingPlanName},
        'gitUrl': { 'value': gitUrl }
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

    const template = JSON.parse(fs.readFileSync(templateFilePath, 'utf8'));
    const deploymentParameters = {
      'properties': {
        'mode': 'Incremental',
        parameters,
        template
      }
    };

    return new BbPromise((resolve, reject) => {
      resourceClient.deployments.createOrUpdate(resourceGroupName,
        deploymentName,
        deploymentParameters, (error, result, createOrUpdateRequest, response) => {
          if (error) {
            reject(error);
          } else {
            this.serverless.cli.log('Waiting for Kudu endpoint...');
            setTimeout(() => {
              resolve(result);
            }, 10000);
          }
        });
    });
  }

  DeleteDeployment() {
    this.serverless.cli.log(`Deleting deployment: ${deploymentName}`);
    const resourceClient = new resourceManagement.ResourceManagementClient(principalCredentials, subscriptionId);

    return new BbPromise((resolve, reject) => {
      resourceClient.deployments.deleteMethod(resourceGroupName,
        deploymentName, (error, result, deleteRequest, response) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
    });
  }

  DeleteResourceGroup() {
    this.serverless.cli.log(`Deleting resource group: ${resourceGroupName}`);
    const resourceClient = new resourceManagement.ResourceManagementClient(principalCredentials, subscriptionId);

    return new BbPromise((resolve, reject) => {
      resourceClient.resourceGroups.deleteMethod(resourceGroupName, (error, result, deleteRequest, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  getAdminKey() {
    const options = {
      'host': functionAppName + constants.scmDomain,
      'port': 443,
      'path': constants.masterKeyApiApth,
      'headers': {
        'Authorization': constants.bearer + principalCredentials.tokenCache._entries[0].accessToken,
        'Content-Type': constants.jsonContentType
      }
    };

    return new BbPromise((resolve, reject) => {
      https.get(options, (res) => {
        let body = '';

        res.on('data', (data) => {
          body += data;
        });
        res.on('end', () => {
          const parsed = JSON.parse(body);

          functionsAdminKey = parsed.masterKey;
          resolve(res);
        });
        res.on('error', (responseError) => {
          reject(responseError);
        });
      });
    });
  }

  pingHostStatus(functionName) {
    const requestUrl = `https://${functionAppName}${constants.functionAppDomain}/admin/functions/${functionName}/status`;
    const options = {
      'host': functionAppName + constants.functionAppDomain,
      'method': 'get',
      'url': requestUrl,
      'headers': {
        'x-functions-key': functionsAdminKey,
        'Accept': 'application/json,*/*'
      }
    };

    return new BbPromise((resolve, reject) => {
      this.serverless.cli.log('Pinging host status...');
      request(options, (err, res, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  isExistingFunctionApp() {
    const host = functionAppName + constants.scmDomain;

    return new BbPromise((resolve, reject) => {
      dns.resolve4(host, (err, addresses) => {
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

  getDeployedFunctionsNames() {
    const requestUrl = `https://${functionAppName}${constants.scmDomain}${constants.functionsApiPath}`;
    const options = {
      'host': functionAppName + constants.scmDomain,
      'method': 'get',
      'url': requestUrl,
      'headers': {
        'Authorization': constants.bearer + principalCredentials.tokenCache._entries[0].accessToken,
        'Accept': 'application/json,*/*'
      }
    };

    return new BbPromise((resolve, reject) => {
      if (existingFunctionApp) {
        this.serverless.cli.log('Loading currently deployed functions...');

        request(options, (err, res, body) => {
          if (err) {
            if (err.message.includes('ENOTFOUND')) {
              resolve(res);
            } else {
              reject(err);
            }
          } else {
            if (res.statusCode === 200) {
              const parsed = JSON.parse(body);

              for (let functionNamesIndex = 0; functionNamesIndex < parsed.length; functionNamesIndex++) {
                deployedFunctionNames.push(parsed[functionNamesIndex].name);
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

  getLogsStream(functionName) {
    const logOptions = {
      'host': functionAppName + constants.scmDomain,
      'port': 443,
      'path': constants.logStreamApiPath + functionName,
      'headers': {
        'Authorization': constants.bearer + principalCredentials.tokenCache._entries[0].accessToken,
        'Accept': '*/*'
      }
    };

    https.get(logOptions, (res) => {
      let body = '';

      res.on('data', (data) => {
        body += data;
        const currentLogs = body.substring(oldLogs.length, body.length - 1);

        console.log(currentLogs);
        oldLogs += currentLogs;
      });
      res.on('end', function () {
        console.log(body);
        this.getLogsStream(functionName);
      });
      res.on('error', (responseError) => {
        console.log(`Got error: ${responseError.message}`);
      });
    });
  }

  getInvocationId(functionName) {
    const options = {
      'host': functionAppName + constants.scmDomain,
      'port': 443,
      'path': `${constants.logInvocationsApiPath + functionAppName}-${functionName}/invocations?limit=5`,
      'headers': {
        'Authorization': constants.bearer + principalCredentials.tokenCache._entries[0].accessToken,
        'Content-Type': constants.jsonContentType
      }
    };

    return new BbPromise((resolve, reject) => {
      https.get(options, (res) => {
        let body = '';

        res.on('data', (data) => {
          body += data;
        });
        res.on('end', () => {
          const parsed = JSON.parse(body);

          invocationId = parsed.entries[0].id;
          resolve(res);
        });
        res.on('error', (responseError) => {
          reject(responseError);
        });
      });
    });
  }

  getLogsForInvocationId() {
    this.serverless.cli.log(`Logs for InvocationId: ${invocationId}`);
    const options = {
      'host': functionAppName + constants.scmDomain,
      'port': 443,
      'path': constants.logOutputApiPath + invocationId,
      'headers': {
        'Authorization': constants.bearer + principalCredentials.tokenCache._entries[0].accessToken,
        'Content-Type': constants.jsonContentType
      }
    };

    return new BbPromise((resolve, reject) => {
      https.get(options, (res) => {
        let body = '';

        res.on('data', (data) => {
          body += data;
        });
        res.on('end', () => {
          console.log(body);
        });
        res.on('error', (e) => {
          reject(e);
        });
        resolve(res);
      });
    });
  }

  invoke(functionName, eventType, eventData) {
    let options = {};

    if (eventType === 'http') {
      let queryString = '';

      if (eventData) {
        Object.keys(eventData).forEach((key) => {
          const value = eventData[key];

          queryString = `${key}=${value}`;
        });
      }
      options = {
        'host': functionAppName + constants.functionAppDomain,
        'port': 443,
        'path': `${constants.functionAppApiPath + functionName}?${queryString}`
      };

      return new BbPromise((resolve, reject) => {
        https.get(options, (res) => {
          let body = '';

          res.on('data', (data) => {
            body += data;
          });
          res.on('end', () => {
            console.log(body);
          });
          res.on('error', (e) => {
            reject(e);
          });
          resolve(res);
        });
      });
    }
    const requestUrl = `https://${functionAppName}${constants.functionsAdminApiPath}${functionName}`;

    options = {
      'host': constants.functionAppDomain,
      'method': 'post',
      'body': eventData,
      'url': requestUrl,
      'json': true,
      'headers': {
        'x-functions-key': functionsAdminKey,
        'Accept': 'application/json,*/*'
      }
    };

    return new BbPromise((resolve, reject) => {
      request(options, (err, res, body) => {
        if (err) {
          reject(err);
        }
        this.serverless.cli.log(`Invoked function at: ${requestUrl}. \nResponse statuscode: ${res.statusCode}`);
        resolve(res);
      });
    });

  }

  syncTriggers() {
    let options = {};
    const requestUrl = ` https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Web/sites/${functionAppName}/functions/synctriggers?api-version=2015-08-01`;
    options = {
      'host': 'management.azure.com',
      'method': 'post',
      'body': {},
      'url': requestUrl,
      'json': true,
      'headers': {
        'Authorization': constants.bearer + principalCredentials.tokenCache._entries[0].accessToken,
        'Accept': 'application/json,*/*'
      }
    };

    return new BbPromise((resolve, reject) => {
      request(options, (err, res, body) => {
        if (err) {
          reject(err);
        }
        this.serverless.cli.log(`Syncing Triggers....Response statuscode: ${res.statusCode}`);
        resolve(res);
      });
    });

  }

  runKuduCommand(command) {
    this.serverless.cli.log(`Running Kudu command ${command}...`);
    let options = {};
    const requestUrl = `https://${functionAppName}${constants.scmDomain}${constants.scmCommandApiPath}`;
    let postBody = {
      "command": command,
      "dir": 'site\\wwwroot'
    }
    options = {
      'host': functionAppName + constants.scmDomain,
      'method': 'post',
      'body': postBody,
      'url': requestUrl,
      'json': true,
      'headers': {
        'Authorization': constants.bearer + principalCredentials.tokenCache._entries[0].accessToken,
        'Accept': 'application/json,*/*'
      }
    };
    return new BbPromise((resolve, reject) => {
      request(options, (err, res, body) => {
        if (err) {
          reject(err);
        }
        resolve(res);
      });
    });

  }
 
  deleteFunctionsExcluding(serverlessFunctions) {
    return this._deleteFunctions((functionName) => {
      var result = serverlessFunctions.indexOf(functionName) < 0;
      return result;
    });
  }

  deleteFunctions(serverlessFunctions) {
    return this._deleteFunctions((functionName) => {
      var result = serverlessFunctions.indexOf(functionName) >= 0;
      return result;
    });
  }

  _deleteFunctions(test) {
    const deleteFunctionPromises = [];

    deployedFunctionNames.forEach((functionName) => {
      if(test(functionName)) {
        this.serverless.cli.log(`Deleting function : ${functionName}`);
        deleteFunctionPromises.push(this.deleteFunction(functionName));
      }
    });

    return BbPromise.all(deleteFunctionPromises);
  };

  deleteFunction(functionName) {
    const requestUrl = `https://${functionAppName}${constants.scmVfsPath}${functionName}/?recursive=true`;
    const options = {
      'host': functionAppName + constants.scmDomain,
      'method': 'delete',
      'url': requestUrl,
      'headers': {
        'Authorization': constants.bearer + principalCredentials.tokenCache._entries[0].accessToken,
        'Accept': '*/*',
        'Content-Type': constants.jsonContentType
      }
    };

    return new BbPromise((resolve, reject) => {
      request(options, (err, res, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  uploadPackageJson(functionName) {
    const requestUrl = `https://${functionAppName}${constants.scmVfsPath}${functionName}/package.json`;
    const options = {
      'host': functionAppName + constants.scmDomain,
      'method': 'put',
      'url': requestUrl,
      'headers': {
        'Authorization': constants.bearer + principalCredentials.tokenCache._entries[0].accessToken,
        'Accept': '*/*',
        'Content-Type': constants.jsonContentType
      }
    };
    var packageJsonFilePath = path.join(this.serverless.config.servicePath, 'package.json');

    return new BbPromise((resolve, reject) => {
      fs.createReadStream(packageJsonFilePath)
        .pipe(request.put(options, (err, res, body) => {
          if (err) {
            reject(err);
          } else {
            resolve('Package json file uploaded');
          }
        }));
    });
  }

  createZipObject(functionName, entryPoint, filePath, params) {
    return new BbPromise((resolve, reject) => {
      this.serverless.cli.log(`Packaging function: ${functionName}`);
      const folderForJSFunction = path.join(functionsFolder, functionName);
      const handlerPath = path.join(this.serverless.config.servicePath, filePath);

      if (!fs.existsSync(functionsFolder)) {
        fs.mkdirSync(functionsFolder);
      }

      if (!fs.existsSync(folderForJSFunction)) {
        fs.mkdirSync(folderForJSFunction);
      }
      fse.copySync(handlerPath, path.join(folderForJSFunction, 'index.js'));
      const functionJSON = params.functionsJson;

      functionJSON.entryPoint = entryPoint;
      fs.writeFileSync(path.join(folderForJSFunction, 'function.json'), JSON.stringify(functionJSON, null, 4));
      fs.readdirSync(functionsFolder).filter((folder) => {
        const folderName = path.basename(folder);

        if (fs.statSync(path.join(functionsFolder, folder)).isDirectory() && functionName == folderName) {
          const zip = new JSZip();

          fs.readdir(path.join(functionsFolder, folder), (err, files) => {
            if (err) {
              reject(err);
            } else {
              let filesInFolder = 0;

              for (let i = 0; i < files.length; i++) {
                const filepathtobezipped = path.join(functionsFolder, folder, files[i]);
                const data = fs.readFileSync(filepathtobezipped);

                filesInFolder++;
                zip.folder(path.basename(folder)).folder(path.basename(folder)).file(path.basename(filepathtobezipped), data);
                if (filesInFolder === files.length) {
                  zipArray.push({
                    'key': path.basename(folder),
                    'value': zip
                  });
                  resolve(`done folder..${folder}`);
                }
              }
            }
          });
        }
      });
    });
  }

  createZipFileAndUploadFunction(folder, zip) {
    return new BbPromise((resolve, reject) => {
      const generateOptions = {
        'type': 'nodebuffer',
        'streamFiles': true
      };
      const zipFileName = `${path.basename(folder)}.zip`;
      const outputZipPath = path.join(functionsFolder, zipFileName);

      zip.folder(path.basename(folder)).generateNodeStream(generateOptions)
        .pipe(fs.createWriteStream(outputZipPath))
        .on('error', (error) => {
          reject(error);
        })
        .on('finish', () => {
          const requestUrl = `https://${functionAppName}${constants.scmZipApiPath}`;
          const options = {
            'url': requestUrl,
            'headers': {
              'Authorization': constants.bearer + principalCredentials.tokenCache._entries[0].accessToken,
              'Accept': '*/*'
            }
          };

          fs.createReadStream(outputZipPath)
            .pipe(request.put(options, (err, res, body) => {
              if (err) {
                reject(err);
              } else {
                resolve('ZipFileCreated and uploaded');
              }
              fse.removeSync(outputZipPath);
            }));
        });
    });
  }

  createAndUploadZipFunctions() {
    const zipFunctions = [];

    for (let j = 0; j < zipArray.length; j++) {
      zipFunctions.push(this.createZipFileAndUploadFunction(zipArray[j].key, zipArray[j].value));
    }

    return BbPromise.all(zipFunctions);
  }
}
module.exports = AzureProvider;
