import { ArmResourceTemplateGenerator } from "../../services/armService";
import { ServerlessAzureConfig, ResourceConfig } from "../../models/serverless";

export const StorageAccountResource: ArmResourceTemplateGenerator = {
  getTemplate: () => {
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
  },

  getParameters: (config: ServerlessAzureConfig) => {
    const resourceConfig: ResourceConfig = {
      name: `${config.provider.prefix}${config.provider.region.substr(0,3)}${config.provider.stage.substr(0,3)}sa`.replace("-", "").toLocaleLowerCase(),
      sku: {},
      ...config.provider.storageAccount,
    };

    return {
      storageAccountName: resourceConfig.name,
      storageAccountSkuName: resourceConfig.sku.name,
      storageAccoutSkuTier: resourceConfig.sku.tier,
    };
  }
};