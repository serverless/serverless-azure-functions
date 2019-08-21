import { ArmResourceTemplate, ArmResourceTemplateGenerator } from "../../models/armTemplates";
import { FunctionAppConfig, ServerlessAzureConfig } from "../../models/serverless";
import { AzureNamingService } from "../../services/namingService";

import nodeVersions from "../../services/nodeVersion.json";
import semver from "semver";

export class FunctionAppResource implements ArmResourceTemplateGenerator {
  public static getResourceName(config: ServerlessAzureConfig) {
    const safeServiceName = config.service.replace(/\s/g, "-");

    return AzureNamingService.getResourceName(config, config.provider.appInsights, safeServiceName);
  }

  public getTemplate(): ArmResourceTemplate {
    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "functionAppRunFromPackage": {
          "defaultValue": "1",
          "type": "String"
        },
        "functionAppName": {
          "defaultValue": "",
          "type": "String"
        },
        "functionAppNodeVersion": {
          "defaultValue": "",
          "type": "String"
        },
        "functionAppWorkerRuntime": {
          "defaultValue": "node",
          "type": "String"
        },
        "functionAppExtensionVersion": {
          "defaultValue": "~2",
          "type": "String"
        },
        "storageAccountName": {
          "defaultValue": "",
          "type": "String"
        },
        "appInsightsName": {
          "defaultValue": "",
          "type": "String"
        },
        "location": {
          "defaultValue": "",
          "type": "String"
        }
      },
      "variables": {},
      "resources": [
        {
          "type": "Microsoft.Web/sites",
          "apiVersion": "2016-03-01",
          "name": "[parameters('functionAppName')]",
          "location": "[parameters('location')]",
          "dependsOn": [
            "[resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName'))]",
            "[concat('microsoft.insights/components/', parameters('appInsightsName'))]"
          ],
          "kind": "functionapp",
          "properties": {
            "siteConfig": {
              "appSettings": [
                {
                  "name": "FUNCTIONS_WORKER_RUNTIME",
                  "value": "[parameters('functionAppWorkerRuntime')]"
                },
                {
                  "name": "FUNCTIONS_EXTENSION_VERSION",
                  "value": "[parameters('functionAppExtensionVersion')]"
                },
                {
                  "name": "AzureWebJobsStorage",
                  "value": "[concat('DefaultEndpointsProtocol=https;AccountName=',parameters('storageAccountName'),';AccountKey=',listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2016-01-01').keys[0].value)]"
                },
                {
                  "name": "WEBSITE_CONTENTAZUREFILECONNECTIONSTRING",
                  "value": "[concat('DefaultEndpointsProtocol=https;AccountName=',parameters('storageAccountName'),';AccountKey=',listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2016-01-01').keys[0].value)]"
                },
                {
                  "name": "WEBSITE_CONTENTSHARE",
                  "value": "[toLower(parameters('functionAppName'))]"
                },
                {
                  "name": "WEBSITE_NODE_DEFAULT_VERSION",
                  "value": "[parameters('functionAppNodeVersion')]"
                },
                {
                  "name": "WEBSITE_RUN_FROM_PACKAGE",
                  "value": "[parameters('functionAppRunFromPackage')]"
                },
                {
                  "name": "APPINSIGHTS_INSTRUMENTATIONKEY",
                  "value": "[reference(concat('microsoft.insights/components/', parameters('appInsightsName'))).InstrumentationKey]"
                }
              ]
            },
            "name": "[parameters('functionAppName')]",
            "clientAffinityEnabled": false,
            "hostingEnvironment": ""
          }
        }
      ]
    };
  }

  public getParameters(config: ServerlessAzureConfig): any {
    const resourceConfig: FunctionAppConfig = {
      ...config.provider.functionApp,
      nodeVersion: this.getNodeVersion(config.provider.runtime)
    };

    return {
      functionAppName: FunctionAppResource.getResourceName(config),
      functionAppNodeVersion: resourceConfig.nodeVersion,
      functionAppWorkerRuntime: resourceConfig.workerRuntime,
      functionAppExtensionVersion: resourceConfig.extensionVersion,
    };
  }

  private getNodeVersion(runtime: string): string{ 
    if(!runtime )
      throw new Error("Node.js runtime version not specified in serverless.yml");

    const nodeVersionObject = nodeVersions["nodejs"];

    for(const nodeVersion of nodeVersionObject){ 
      if(runtime.includes(nodeVersion["version"])){
        return nodeVersion["version"]; }
    } 
    
    //Searches for the latest verison
    if(runtime.includes(".x")){
      let majorVersion =  runtime.replace(/[^0-9]/g,"");
      let nodeVersionsArray: string[] = [];
    
      for(const nodeVersion of nodeVersionObject){ 
        let runtimeMajorVersion = nodeVersion["version"].split(".", 1);
        if(runtimeMajorVersion[0] == majorVersion){
          nodeVersionsArray.push(nodeVersion["version"]);
        }
      } 

      if(nodeVersionsArray.length != 0)
        return nodeVersionsArray.sort(semver.rcompare)[0];
    }
    throw new Error("Invalid Node.js version");
  }  
}
