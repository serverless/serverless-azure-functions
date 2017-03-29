'use strict';

const BbPromise = require('bluebird');
const deleteResourceGroup = require('./lib/deleteResourceGroup');
const loginToAzure = require('../shared/loginToAzure');

class AzureRemove {
  constructor (serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      loginToAzure,
      deleteResourceGroup
    );

    this.hooks = {
      'remove:remove': () => BbPromise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options))
        .then(this.loginToAzure)
        .then(this.deleteResourceGroup)
        .then(() => this.serverless.cli.log('Service successfully removed'))
    };
  }
}

module.exports = AzureRemove;
