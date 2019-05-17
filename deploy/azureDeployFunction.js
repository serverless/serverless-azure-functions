'use strict';

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

      'deploy:function:deploy': async () => await this.deployFunction.bind(this)
    };
  }

  async deployFunction () {
    await this.provider.initialize(this.serverless, this.options);
    await this.uploadFunction();
    this.serverless.cli.log('Successfully uploaded Function');
  }
}

module.exports = AzureDeployFunction;
