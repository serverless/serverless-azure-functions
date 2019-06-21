import { ArmResourceTemplateGenerator } from "../../services/armService";
import { ServerlessAzureConfig, ResourceConfig } from "../../models/serverless";

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
        "appServicePlanName": {
          "defaultValue": "",
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
            "[concat('Microsoft.Web/serverfarms/', parameters('appServicePlanName'))]",
            "[resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName'))]",
            "[concat('microsoft.insights/components/', parameters('appInsightsName'))]"
          ],
          "kind": "functionapp",
          "properties": {
            "siteConfig": {
              "appSettings": [
                {
                  "name": "FUNCTIONS_WORKER_RUNTIME",
                  "value": "node"
                },
                {
                  "name": "FUNCTIONS_EXTENSION_VERSION",
                  "value": "~2"
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
                  "value": "10.14.1"
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
            "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', parameters('appServicePlanName'))]",
            "hostingEnvironment": ""
          }
        }
      ]
    };
  },

  getParameters: (config: ServerlessAzureConfig) => {
    const resourceConfig: ResourceConfig = {
      name: `${config.provider.prefix}-${config.provider.region}-${config.provider.stage}-functionapp`,
      ...config.provider.functionApp,
    };

    return {
      functionAppName: resourceConfig.name,
    };
  }
};
