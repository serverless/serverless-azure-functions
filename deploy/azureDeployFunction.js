'use strict';

const BbPromise = require('bluebird');
const createFunction = require('./lib/createFunction');
const loginToAzure = require('../shared/loginToAzure');
const createEventsBinding = require('./lib/createEventsBinding');

class AzureDeployFunction {
  constructor (serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      loginToAzure,
      createEventsBinding,
      createFunction
    );

    this.hooks = {
      'before:deploy:function:packageFunction': () => BbPromise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options))
        .then(this.createEventsBinding),

      'deploy:function:packageFunction': () => this.serverless.pluginManager
          .spawn('package:function'),

      'deploy:function:deploy': () => BbPromise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options))
        .then(this.loginToAzure)
        .then(this.createFunction)
        .then(() => this.serverless.cli.log('Successfully uploaded Function'))
    };
  }
}

module.exports = AzureDeployFunction;
