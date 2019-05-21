import { join } from 'path';
import * as Serverless from 'serverless';
import * as fs from 'fs';
import request from 'request';
import config from '../config';
import { getBindingsMetaData } from '../shared/bindings';

let functionAppName;
let functionsAdminKey;
let invocationId;

export default class AzureProvider {
  public credentials: any;

  private serverless: any;
  private parsedBindings: any;

  static getProviderName() {
    return config.providerName;
  }

  constructor(serverless: Serverless) {
    this.serverless = serverless;
    this.serverless.setProvider(config.providerName, this);
  }

  

  getAdminKey(): Promise<any> {
    const options = {
      url: `https://${functionAppName}${config.scmDomain}${config.masterKeyApiPath}`,
      json: true,
      headers: {
        Authorization: config.bearer + this.credentials.tokenCache._entries[0].accessToken
      }
    };

    return new Promise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(body);

        functionsAdminKey = body.masterKey;

        resolve(body.masterKey);
      });
    });
  }

  pingHostStatus(functionName): Promise<any> {
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

    return new Promise((resolve, reject) => {
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
      .on('end', () => this.getLogsStream(functionName))
      .pipe(process.stdout);
  }

  getInvocationId(functionName): Promise<any> {
    const options = {
      url: `https://${functionAppName}${config.scmDomain}${config.logInvocationsApiPath + functionAppName}-${functionName}/invocations?limit=5`,
      method: 'GET',
      json: true,
      headers: {
        Authorization: config.bearer + this.credentials.tokenCache._entries[0].accessToken
      }
    };

    return new Promise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(body);

        invocationId = body.entries[0].id;

        resolve(body.entries[0].id);
      });
    });
  }

  getLogsForInvocationId(): Promise<any> {
    this.serverless.cli.log(`Logs for InvocationId: ${invocationId}`);
    const options = {
      url: `https://${functionAppName}${config.scmDomain}${config.logOutputApiPath}${invocationId}`,
      method: 'GET',
      json: true,
      headers: {
        Authorization: config.bearer + this.credentials.tokenCache._entries[0].accessToken
      }
    };

    return new Promise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(body);

        resolve(body);
      });
    });
  }

  invoke(functionName, eventType, eventData): Promise<any> {
    if (eventType === 'http') {
      let queryString = '';

      if (eventData) {
        if (typeof eventData === 'string') {
          try {
            eventData = JSON.parse(eventData);
          }
          catch (error) {
            return Promise.reject('The specified input data isn\'t a valid JSON string. ' +
              'Please correct it and try invoking the function again.');
          }
        }

        queryString = Object.keys(eventData)
          .map((key) => `${key}=${eventData[key]}`)
          .join('&');
      }

      return new Promise((resolve, reject) => {
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

    return new Promise((resolve, reject) => {
      request(options, (err, res) => {
        if (err) {
          reject(err);
        }
        this.serverless.cli.log(`Invoked function at: ${requestUrl}. \nResponse statuscode: ${res.statusCode}`);
        resolve(res);
      });
    });
  }

  uploadPackageJson(): Promise<any> {
    const packageJsonFilePath = join(this.serverless.config.servicePath, 'package.json');
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

    return new Promise((resolve, reject) => {
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

  
}
