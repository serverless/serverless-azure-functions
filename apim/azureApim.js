'use strict';

const BbPromise = require('bluebird');
const deployApi = require('./lib/deployApi');
const deployOperations = require('./lib/deployOperations');
const loginToAzure = require('../shared/loginToAzure');

class AzureApim {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    this.serverless.cli.log('Initializing APIM plugin');

    Object.assign(
      this,
      loginToAzure,
      deployApi,
      deployOperations
    );

    this.hooks = {
      'deploy:deploy': () => BbPromise.bind(this)
        .then(this.provider.initialize(this.serverless, this.options))
        .then(() => this.serverless.cli.log('Starting APIM deployment'))
        .then(() => this.serverless.cli.log(JSON.stringify(this.options)))
        .then(this.loginToAzure)
        .then(this.deployApi)
        .then(this.deployOperations)
        .then(() => this.serverless.cli.log('Successfully deployed API Management API & Operations'))
    };
  }
}

module.exports = AzureApim;