import { ArmResourceTemplateGenerator, ArmResourceTemplate } from "../../models/armTemplates";
import { ServerlessAzureConfig, ResourceConfig } from "../../models/serverless";
import { Utils } from "../../shared/utils";

export class StorageAccountResource implements ArmResourceTemplateGenerator {
  public static getResourceName(config: ServerlessAzureConfig) {
    return config.provider.storageAccount && config.provider.storageAccount.name
      ? config.provider.storageAccount.name
      : StorageAccountResource.getDefaultStorageAccountName(config)
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

  /**
   * Gets a default storage account name.
   * Storage account names can have at most 24 characters and can have only alpha-numerics
   * Default naming convention:
   * 
   * "(first 3 of prefix)(first 3 of region)(first 3 of stage)(first 12 of service)sa"
   * (Maximum of 23 characters)
   * @param config Serverless Azure Config
   */
  private static getDefaultStorageAccountName(config: ServerlessAzureConfig): string {
    const prefix = Utils.appendSubstrings(
      3,
      config.provider.prefix,
      config.provider.region,
      config.provider.stage,
    );
    return `${prefix}${config.service.substr(0, 12)}sa`.replace("-", "").toLocaleLowerCase();
  }
}