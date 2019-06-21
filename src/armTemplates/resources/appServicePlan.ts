import { ArmResourceTemplateGenerator } from "../../services/armService";
import { ServerlessAzureConfig, ResourceConfig } from "../../models/serverless";

export const AppServicePlanResource: ArmResourceTemplateGenerator = {
  getTemplate: () => {
    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "appServicePlanName": {
          "defaultValue": "",
          "type": "String"
        },
        "location": {
          "defaultValue": "",
          "type": "String"
        },
        "appServicePlanSkuName": {
          "defaultValue": "EP1",
          "type": "String"
        },
        "appServicePlanSkuTier": {
          "defaultValue": "ElasticPremium",
          "type": "String"
        }
      },
      "variables": {},
      "resources": [
        {
          "apiVersion": "2016-09-01",
          "name": "[parameters('appServicePlanName')]",
          "type": "Microsoft.Web/serverfarms",
          "location": "[parameters('location')]",
          "properties": {
            "name": "[parameters('appServicePlanName')]",
            "workerSizeId": "3",
            "numberOfWorkers": "1",
            "maximumElasticWorkerCount": "10",
            "hostingEnvironment": ""
          },
          "sku": {
            "name": "[parameters('appServicePlanSkuName')]",
            "tier": "[parameters('appServicePlanSkuTier')]"
          }
        }
      ]
    };
  },
  
  getParameters: (config: ServerlessAzureConfig) => {
    const resourceConfig: ResourceConfig = {
      name: `${config.provider.prefix}-${config.provider.region}-${config.provider.stage}-asp`,
      sku: {},
      ...config.provider.storageAccount,
    };

    return {
      appServicePlanName: resourceConfig.name,
      appServicePlanSkuName: resourceConfig.sku.name,
      appServicePlanSkuTier: resourceConfig.sku.tier,
    }
  }
};