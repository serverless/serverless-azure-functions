const BbPromise = require('bluebird');
const path = require('path');
const fs = require('fs');
const request = require('request');
const parseBindings = require('../shared/parseBindings');
const config = require('../config');

let functionAppName;
let functionsAdminKey;
let invocationId;

export default class AzureProvider {
  static getProviderName() {
    return config.providerName;
  }

  constructor(serverless) {
    this.provider = this;
    this.serverless = serverless;

    this.serverless.setProvider(config.providerName, this);
  }

  initialize(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    // Overrides function app domains.
    // In instances where the function app is deployed in an App Service Environment (ASE)
    // the domains will be prefixed with a custom sub domain
    config.functionAppDomain = this.serverless.service.provider.functionAppDomain || config.functionAppDomain;
    config.scmDomain = this.serverless.service.provider.scmDomain || config.scmDomain;

    return new BbPromise((resolve) => {
      functionAppName = this.serverless.service.service;

      resolve();
    });
  }

  getParsedBindings() {
    if (!this.parsedBindings) {
      this.parsedBindings = parseBindings.getBindingsMetaData(this.serverless);
    }

    return this.parsedBindings;
  }

  getAdminKey() {
    const options = {
      url: `https://${functionAppName}${config.scmDomain}${config.masterKeyApiPath}`,
      json: true,
      headers: {
        Authorization: config.bearer + this.credentials.tokenCache._entries[0].accessToken
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

  pingHostStatus(functionName) {
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

  getLogsStream(functionName) {
    const logOptions = {
      url: `https://${functionAppName}${config.scmDomain}${config.logStreamApiPath}${functionName}`,
      headers: {
        Authorization: config.bearer + this.credentials.tokenCache._entries[0].accessToken,
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

  getInvocationId(functionName) {
    const options = {
      url: `https://${functionAppName}${config.scmDomain}${config.logInvocationsApiPath + functionAppName}-${functionName}/invocations?limit=5`,
      method: 'GET',
      json: true,
      headers: {
        Authorization: config.bearer + this.credentials.tokenCache._entries[0].accessToken
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

  getLogsForInvocationId() {
    this.serverless.cli.log(`Logs for InvocationId: ${invocationId}`);
    const options = {
      url: `https://${functionAppName}${config.scmDomain}${config.logOutputApiPath}${invocationId}`,
      method: 'GET',
      json: true,
      headers: {
        Authorization: config.bearer + this.credentials.tokenCache._entries[0].accessToken
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

  invoke(functionName, eventType, eventData) {
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

    const requestUrl = `https://${functionAppName}${config.functionAppDomain}${config.functionsAdminApiPath}${functionName}`;

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

  uploadPackageJson() {
    const packageJsonFilePath = path.join(this.serverless.config.servicePath, 'package.json');
    this.serverless.cli.log('Uploading package.json...');

    const requestUrl = `https://${functionAppName}${config.scmDomain}${config.scmVfsPath}package.json`;
    const options = {
      host: functionAppName + config.scmDomain,
      method: 'put',
      url: requestUrl,
      json: true,
      headers: {
        Authorization: config.bearer + this.credentials.tokenCache._entries[0].accessToken,
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
      fs.writeFileSync(path.join(this.serverless.config.servicePath, functionName + '-function.json'), JSON.stringify(functionJSON, null, 4));
      resolve();
    });
  }
}
