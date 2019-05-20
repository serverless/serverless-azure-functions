/*
NOTE: this plugin is used to add all the different provider related plugins at once.
This way only one plugin needs to be added to the service in order to get access to the
whole provider implementation.
*/

import '@babel/polyfill';
import AzureInvoke from './plugins/invoke/azureInvoke';
import AzureLogs from './plugins/logs/azureLogs';
import AzureRemove from './plugins/remove/azureRemove';
import AzurePackage from './plugins/package/azurePackage';
import AzurePackageFunction from './plugins/package/azurePackageFunction';
import AzureProvider from './provider/azureProvider';
import { AzureDeployPlugin } from './plugins/deploy/azureDeployPlugin';
import { AzureDeployFunctionPlugin } from './plugins/deploy/azureDeployFunctionPlugin';
import { AzureLoginPlugin } from './plugins/login/loginPlugin';
import { AzureApimServicePlugin } from './plugins/apim/apimServicePlugin';
import { AzureApimFunctionPlugin } from './plugins/apim/apimFunctionPlugin';

export class AzureIndex {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.serverless.setProvider(AzureProvider.getProviderName(), new AzureProvider(serverless));

    // To be refactored
    this.serverless.pluginManager.addPlugin(AzurePackage);
    this.serverless.pluginManager.addPlugin(AzurePackageFunction);
    this.serverless.pluginManager.addPlugin(AzureInvoke);
    this.serverless.pluginManager.addPlugin(AzureLogs);
    this.serverless.pluginManager.addPlugin(AzureRemove);
    // Refactored
    this.serverless.pluginManager.addPlugin(AzureLoginPlugin);
    this.serverless.pluginManager.addPlugin(AzureDeployPlugin);
    this.serverless.pluginManager.addPlugin(AzureDeployFunctionPlugin);
    this.serverless.pluginManager.addPlugin(AzureApimServicePlugin);
    this.serverless.pluginManager.addPlugin(AzureApimFunctionPlugin);
  }
}

module.exports = AzureIndex;