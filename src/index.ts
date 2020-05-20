/*
NOTE: this plugin is used to add all the different provider related plugins at once.
This way only one plugin needs to be added to the service in order to get access to the
whole provider implementation.
*/

import Serverless from "serverless";
import AzureProvider from "./provider/azureProvider";
import { AzureInvokePlugin } from "./plugins/invoke/azureInvokePlugin";
import { AzureRemovePlugin } from "./plugins/remove/azureRemovePlugin";
import { AzurePackagePlugin } from "./plugins/package/azurePackagePlugin";
import { AzureDeployPlugin } from "./plugins/deploy/azureDeployPlugin";
import { AzureLoginPlugin } from "./plugins/login/azureLoginPlugin";
import { AzureApimPlugin } from "./plugins/apim/azureApimPlugin";
import { AzureFuncPlugin } from "./plugins/func/azureFuncPlugin";
import { AzureOfflinePlugin } from "./plugins/offline/azureOfflinePlugin"
import { AzureRollbackPlugin } from "./plugins/rollback/azureRollbackPlugin"
import { AzureKeyVaultPlugin } from "./plugins/identity/azureKeyVaultPlugin"
import { AzureInfoPlugin } from "./plugins/info/azureInfoPlugin";

export default class AzureIndex {
  public constructor(private serverless: Serverless, private options) {
    this.serverless.setProvider(AzureProvider.getProviderName(), new AzureProvider(serverless) as any);

    // To be refactored
    this.serverless.pluginManager.addPlugin(AzurePackagePlugin);
    this.serverless.pluginManager.addPlugin(AzureInvokePlugin);
    this.serverless.pluginManager.addPlugin(AzureRemovePlugin);
    // Refactored
    this.serverless.pluginManager.addPlugin(AzureLoginPlugin);
    this.serverless.pluginManager.addPlugin(AzureDeployPlugin);
    this.serverless.pluginManager.addPlugin(AzureApimPlugin);
    this.serverless.pluginManager.addPlugin(AzureFuncPlugin);
    this.serverless.pluginManager.addPlugin(AzureOfflinePlugin);
    this.serverless.pluginManager.addPlugin(AzureRollbackPlugin);
    this.serverless.pluginManager.addPlugin(AzureKeyVaultPlugin);
    this.serverless.pluginManager.addPlugin(AzureInfoPlugin);
  }
}

module.exports = AzureIndex;
