'use strict';

const BbPromise = require('bluebird');
const uploadFunction = require('./lib/uploadFunction');
const loginToAzure = require('../shared/loginToAzure');

class AzureDeployFunction {
  constructor (serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      loginToAzure,
      uploadFunction
    );

    this.hooks = {
      // Spawn 'package:function' to create the single-function zip artifact
      'deploy:function:packageFunction': () => this.serverless.pluginManager
          .spawn('package:function'),

      'deploy:function:deploy': () => BbPromise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options))
        .then(this.loginToAzure)
        .then(this.uploadFunction)
        .then(() => this.serverless.cli.log('Successfully uploaded Function'))
    };
  }
}

module.exports = AzureDeployFunction;
