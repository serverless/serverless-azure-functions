/*
NOTE: this plugin is used to add all the different provider related plugins at once.
This way only one plugin needs to be added to the service in order to get access to the
whole provider implementation.
*/

import Serverless from "serverless";
import AzureProvider from "./provider/azureProvider";
import { AzureInvokePlugin } from "./plugins/invoke/azureInvokePlugin";
import { AzureLogsPlugin } from "./plugins/logs/azureLogsPlugin";
import { AzureRemovePlugin } from "./plugins/remove/azureRemovePlugin";
import { AzurePackagePlugin } from "./plugins/package/azurePackagePlugin";
import { AzureDeployPlugin } from "./plugins/deploy/azureDeployPlugin";
import { AzureLoginPlugin } from "./plugins/login/azureLoginPlugin";
import { AzureApimServicePlugin } from "./plugins/apim/azureApimServicePlugin";
import { AzureApimFunctionPlugin } from "./plugins/apim/azureApimFunctionPlugin";
import { AzureFuncPlugin } from "./plugins/func/azureFuncPlugin";
import { AzureOfflinePlugin } from "./plugins/offline/azureOfflinePlugin"
import { AzureRollbackPlugin } from "./plugins/rollback/azureRollbackPlugin"


export default class AzureIndex {
  public constructor(private serverless: Serverless, private options) {
    this.serverless.setProvider(AzureProvider.getProviderName(), new AzureProvider(serverless) as any);

    // To be refactored
    this.serverless.pluginManager.addPlugin(AzurePackagePlugin);
    this.serverless.pluginManager.addPlugin(AzureInvokePlugin);
    this.serverless.pluginManager.addPlugin(AzureLogsPlugin);
    this.serverless.pluginManager.addPlugin(AzureRemovePlugin);
    // Refactored
    this.serverless.pluginManager.addPlugin(AzureLoginPlugin);
    this.serverless.pluginManager.addPlugin(AzureDeployPlugin);
    this.serverless.pluginManager.addPlugin(AzureApimServicePlugin);
    this.serverless.pluginManager.addPlugin(AzureApimFunctionPlugin);
    this.serverless.pluginManager.addPlugin(AzureFuncPlugin);
    this.serverless.pluginManager.addPlugin(AzureOfflinePlugin);
    this.serverless.pluginManager.addPlugin(AzureRollbackPlugin);
  }
}

module.exports = AzureIndex;
