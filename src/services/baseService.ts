import axios from 'axios';

export class BaseService {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.baseUrl = 'https://management.azure.com';
    this.serviceName = serverless.service.service;
    this.credentials = serverless.variables.azureCredentials;
    this.subscriptionId = serverless.variables.subscriptionId;
    this.resourceGroup = serverless.service.provider.resourceGroup || `${this.serviceName}-rg`;
    this.deploymentName = serverless.service.provider.deploymentName || `${this.resourceGroup}-deployment`;
  }

  async sendApiRequest(method, relativeUrl, options = {}) {
    const defaultHeaders = {
      'Authorization': `Bearer ${this.credentials.tokenCache._entries[0].accessToken}`
    };

    const allHeaders = Object.assign({}, defaultHeaders, options.headers);

    const requestOptions = Object.assign({}, options, {
      method: method,
      headers: allHeaders,
    });

    return await axios(relativeUrl, requestOptions);
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
}