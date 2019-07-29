import { ArmResourceTemplate, ArmResourceTemplateGenerator, ArmResourceType } from "../../models/armTemplates";
import { ResourceConfig, ServerlessAzureConfig } from "../../models/serverless";

export class StorageAccountResource implements ArmResourceTemplateGenerator {

  public getArmResourceType(): ArmResourceType {
    return ArmResourceType.StorageAccount;
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

  public getParameters(config: ServerlessAzureConfig, namer: (resource: ArmResourceType) => string): any {
    const resourceConfig: ResourceConfig = {
      sku: {},
      ...config.provider.storageAccount,
    };

    return {
      storageAccountName: namer(this.getArmResourceType()),
      storageAccountSkuName: resourceConfig.sku.name,
      storageAccoutSkuTier: resourceConfig.sku.tier,
    };
  }
}
