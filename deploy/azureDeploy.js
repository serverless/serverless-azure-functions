'use strict';

const BbPromise = require('bluebird');
const CreateResourceGroupAndFunctionApp = require('./lib/CreateResourceGroupAndFunctionApp');
const uploadFunctions = require('./lib/uploadFunctions');
const cleanUpFunctions = require('./lib/cleanUpFunctions');
const loginToAzure = require('../shared/loginToAzure');

class AzureDeploy {
  constructor (serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      loginToAzure,
      cleanUpFunctions,
      CreateResourceGroupAndFunctionApp,
      uploadFunctions
    );

    this.hooks = {
      'before:deploy:deploy': () => BbPromise.bind(this)
        .then(this.provider.initialize(this.serverless, this.options))
        .then(this.loginToAzure)
        .then(this.cleanUpFunctions),

      'deploy:deploy': () => BbPromise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options))
        .then(this.CreateResourceGroupAndFunctionApp)
        .then(this.uploadFunctions)
        .then(() => this.serverless.cli.log('Successfully created Function App'))
    };
  }
}

module.exports = AzureDeploy;
