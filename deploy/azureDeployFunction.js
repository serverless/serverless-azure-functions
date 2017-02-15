'use strict';

const BbPromise = require('bluebird');
const createFunction = require('./lib/createFunction');
const loginToAzure = require('../shared/loginToAzure');

class AzureDeployFunction {
  constructor (serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      loginToAzure,
      createFunction
    );

    this.hooks = {
      'deploy:function:deploy': () => BbPromise.bind(this)
        .then(this.loginToAzure)
        .then(this.createFunction)
        .then(() => this.serverless.cli.log('Successfully uploaded Function'))
    };
  }
}

module.exports = AzureDeployFunction;
