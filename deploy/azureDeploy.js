'use strict';

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
      'before:deploy:deploy': () => this.beforeDeploy.bind(this),
      'deploy:deploy': () => this.deploy.bind(this)
    };
  }

  async beforeDeploy() {
    await this.provider.initialize(this.serverless, this.options);
    await this.cleanUpFunctions();
  }

  async deploy() {
    await this.provider.initialize(this.serverless, this.options);
    await this.CreateResourceGroupAndFunctionApp();
    await this.uploadFunctions();
    this.serverless.cli.log('Successfully created Function App');
  }
}

module.exports = AzureDeploy;
