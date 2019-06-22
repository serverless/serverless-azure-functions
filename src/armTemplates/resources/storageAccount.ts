import { ArmResourceTemplateGenerator, ArmResourceTemplate } from "../../models/armTemplates";
import { ServerlessAzureConfig, ResourceConfig } from "../../models/serverless";

export class StorageAccountResource implements ArmResourceTemplateGenerator {
  public static getResourceName(config: ServerlessAzureConfig) {
    return config.provider.storageAccount && config.provider.storageAccount.name
      ? config.provider.storageAccount.name
      : `${config.provider.prefix}${config.provider.region.substr(0, 3)}${config.provider.stage.substr(0, 3)}sa`.replace("-", "").toLocaleLowerCase();
  }

  public getTemplate(): ArmResourceTemplate {
    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "storageAccountName": {
          "defaultValue": "",
          "type": "String"
        },
        "location": {
          "defaultValue": "",
          "type": "String"
        },
        "storageAccountSkuName": {
          "defaultValue": "Standard_LRS",
          "type": "String"
        },
        "storageAccoutSkuTier": {
          "defaultValue": "Standard",
          "type": "String"
        }
      },
      "variables": {},
      "resources": [
        {
          "apiVersion": "2018-07-01",
          "name": "[parameters('storageAccountName')]",
          "type": "Microsoft.Storage/storageAccounts",
          "location": "[parameters('location')]",
          "kind": "Storage",
          "properties": {
            "accountType": "[parameters('storageAccountSkuName')]"
          },
          "sku": {
            "name": "[parameters('storageAccountSkuName')]",
            "tier": "[parameters('storageAccoutSkuTier')]"
          }
        }
      ]
    }
  }

  public getParameters(config: ServerlessAzureConfig): any {
    const resourceConfig: ResourceConfig = {
      sku: {},
      ...config.provider.storageAccount,
    };

    return {
      storageAccountName: StorageAccountResource.getResourceName(config),
      storageAccountSkuName: resourceConfig.sku.name,
      storageAccoutSkuTier: resourceConfig.sku.tier,
    };
  }
}