'use strict';

const BbPromise = require('bluebird');
const deployApi = require('./lib/deployApi');
const deployOperation = require('./lib/deployOperation');
const loginToAzure = require('../shared/loginToAzure');

class AzureApimFunction {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    this.serverless.cli.log('Initializing APIM Function plugin');

    Object.assign(
      this,
      loginToAzure,
      deployApi,
      deployOperation
    );

    this.hooks = {
      'deploy:functions': () => BbPromise.bind(this)
        .then(this.provider.initialize(this.serverless, this.options))
        .then(this.loginToAzure)
        .then(this.deployApi)
        .then(this.deployOperation)
        .then(() => this.serverless.cli.log('Successfully deployed API Management API'))
    };
  }
}

module.exports = AzureApimFunction;
