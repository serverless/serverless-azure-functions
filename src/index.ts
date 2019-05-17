/*
NOTE: this plugin is used to add all the differnet provider related plugins at once.
This way only one plugin needs to be added to the service in order to get access to the
whole provider implementation.
*/

import AzureDeploy from "./deploy/azureDeploy";
import AzureDeployFunction from './deploy/azureDeployFunction';
import AzureInvoke from './invoke/azureInvoke';
import AzureLogs from './logs/azureLogs';
import AzurePackage from './package/azurePackage';
import AzurePackageFunction from './package/azurePackageFunction';
import AzureProvider from './provider/azureProvider';
import AzureRemove from './remove/azureRemove';


export default class AzureIndex {
  serverless: any;
  options: any;
  
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.serverless.setProvider(AzureProvider.getProviderName(), new AzureProvider(serverless));

    this.serverless.pluginManager.addPlugin(AzurePackage);
    this.serverless.pluginManager.addPlugin(AzurePackageFunction); 
    this.serverless.pluginManager.addPlugin(AzureDeploy);
    this.serverless.pluginManager.addPlugin(AzureDeployFunction);
    this.serverless.pluginManager.addPlugin(AzureInvoke);
    this.serverless.pluginManager.addPlugin(AzureLogs);
    this.serverless.pluginManager.addPlugin(AzureRemove);
  }
}
