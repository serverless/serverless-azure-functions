import { ArmResourceTemplateGenerator } from "../../models/armTemplates";
import { ServerlessAzureConfig, ResourceConfig, FunctionAppConfig } from "../../models/serverless";

export const FunctionAppResource: ArmResourceTemplateGenerator = {
  getTemplate: () => {
    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "functionAppName": {
          "defaultValue": "",
          "type": "String"
        },
        "functionAppNodeVersion": {
          "defaultValue": "10.14.1",
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
                  "value": "1"
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
  },

  getParameters: (config: ServerlessAzureConfig) => {
    const resourceConfig: FunctionAppConfig = {
      name: `${config.provider.prefix}-${config.provider.region}-${config.provider.stage}-${config.service}`,
      ...config.provider.functionApp,
    };

    return {
      functionAppName: resourceConfig.name,
      functionAppNodeVersion: resourceConfig.nodeVersion,
      functionAppWorkerRuntime: resourceConfig.workerRuntime,
      functionAppExtensionVersion: resourceConfig.extensionVersion,
    };
  }
};
