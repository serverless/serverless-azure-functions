'use strict';

const BbPromise = require('bluebird');
const deleteResourceGroup = require('./lib/deleteResourceGroup');
const cleanUpFunctions = require('./lib/cleanUpFunctions');
const loginToAzure = require('../shared/loginToAzure');

class AzureRemove {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      loginToAzure,
      cleanUpFunctions,
      deleteResourceGroup
    );

    // if we are using the default resource group (i.e. the developer hasn't specified one in the serverless.yml file)
    // or the developer has provided the --clean command-line argument, then we will perform the remove by deleting everything
    // from azure, leaving the subscription in a clean state.
    if (options.clean || this.provider.isDefaultResourceGroup) {
      this.hooks = {
        'remove:remove': () => BbPromise.bind(this)
          .then(this.loginToAzure)
          .then(this.deleteResourceGroup)
          .then(() => this.serverless.cli.log('Service successfully removed, Resource Group deleted.'))
      };
    }
    else {
      this.hooks = {
        'remove:remove': () => BbPromise.bind(this)
          .then(this.loginToAzure)
          .then(this.cleanUpFunctions)
          .then(() => this.serverless.cli.log('Service successfully removed'))
          .then(() => this.serverless.cli.log(`\n\nNOTE: Only service functions have been removed. To remove the deployment provide '--clean' as a CLI argument.`))
      };
    }
  }
}

module.exports = AzureRemove;
