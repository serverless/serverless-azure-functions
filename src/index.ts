/*
NOTE: this plugin is used to add all the different provider related plugins at once.
This way only one plugin needs to be added to the service in order to get access to the
whole provider implementation.
*/

import Serverless from "serverless";
import AzureProvider from "./provider/azureProvider";
import { AzureInvoke } from "./plugins/invoke/azureInvoke";
import { AzureLogs } from "./plugins/logs/azureLogs";
import { AzureRemove } from "./plugins/remove/azureRemove";
import { AzurePackage } from "./plugins/package/azurePackage";
import { AzureDeployPlugin } from "./plugins/deploy/azureDeployPlugin";
import { AzureLoginPlugin } from "./plugins/login/loginPlugin";
import { AzureApimServicePlugin } from "./plugins/apim/apimServicePlugin";
import { AzureApimFunctionPlugin } from "./plugins/apim/apimFunctionPlugin";
import { AzureFuncPlugin } from "./plugins/func/azureFunc";
import { AzureFuncAddPlugin } from "./plugins/func/add/azureFuncAdd";
import { AzureFuncRemovePlugin } from "./plugins/func/remove/azureFuncRemove";


export class AzureIndex {
  constructor(private serverless: Serverless, private options) {
    this.serverless.setProvider(AzureProvider.getProviderName(), new AzureProvider(serverless) as any);

    // To be refactored
    this.serverless.pluginManager.addPlugin(AzurePackage);
    this.serverless.pluginManager.addPlugin(AzureInvoke);
    this.serverless.pluginManager.addPlugin(AzureLogs);
    this.serverless.pluginManager.addPlugin(AzureRemove);
    // Refactored
    this.serverless.pluginManager.addPlugin(AzureLoginPlugin);
    this.serverless.pluginManager.addPlugin(AzureDeployPlugin);
    this.serverless.pluginManager.addPlugin(AzureApimServicePlugin);
    this.serverless.pluginManager.addPlugin(AzureApimFunctionPlugin);
    this.serverless.pluginManager.addPlugin(AzureFuncPlugin);
    this.serverless.pluginManager.addPlugin(AzureFuncAddPlugin);
    this.serverless.pluginManager.addPlugin(AzureFuncRemovePlugin);
  }
}

module.exports = AzureIndex;