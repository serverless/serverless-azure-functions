import { ArmResourceTemplateGenerator, ArmResourceTemplate } from "../../models/armTemplates";
import { ServerlessAzureConfig, ResourceConfig } from "../../models/serverless";

export class AppServicePlanResource implements ArmResourceTemplateGenerator {
  public static getResourceName(config: ServerlessAzureConfig) {
    return config.provider.appServicePlan && config.provider.appServicePlan.name
      ? config.provider.appServicePlan.name
      : `${config.provider.prefix}-${config.provider.region}-${config.provider.stage}-asp`;
  }

  public getTemplate(): ArmResourceTemplate {
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
  }

  public getParameters(config: ServerlessAzureConfig): any {
    const resourceConfig: ResourceConfig = {
      sku: {},
      ...config.provider.storageAccount,
    };

    return {
      appServicePlanName: AppServicePlanResource.getResourceName(config),
      appServicePlanSkuName: resourceConfig.sku.name,
      appServicePlanSkuTier: resourceConfig.sku.tier,
    }
  }
}