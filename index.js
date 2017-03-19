'use strict';

/*
NOTE: this plugin is used to add all the differnet provider related plugins at once.
This way only one plugin needs to be added to the service in order to get access to the
whole provider implementation.
*/

const AzureDeploy = require('./deploy/azureDeploy');
const AzureDeployFunction = require('./deploy/azureDeployFunction');
const AzureProvider = require('./provider/azureProvider');
const AzureInvoke = require('./invoke/azureInvoke');
const AzureLogs = require('./logs/azureLogs');
const AzureRemove = require('./remove/azureRemove');


class AzureIndex {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    // if we do this before the addPlugin calls then these options will be passed through
    this.serverless.pluginManager.setCliOptions(options);

    this.serverless.pluginManager.addPlugin(AzureProvider);
    this.serverless.pluginManager.addPlugin(AzureDeploy);
    this.serverless.pluginManager.addPlugin(AzureDeployFunction);
    this.serverless.pluginManager.addPlugin(AzureInvoke);
    this.serverless.pluginManager.addPlugin(AzureLogs);
    this.serverless.pluginManager.addPlugin(AzureRemove);
  }
}

module.exports = AzureIndex;
