import { ArmResourceTemplateGenerator, ArmResourceTemplate } from "../../models/armTemplates";
import { ServerlessAzureConfig, ResourceConfig } from "../../models/serverless";
import { Utils } from "../../shared/utils";
import md5 from "md5";

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
   * @param config Serverless Azure Config
   */
  private static getDefaultStorageAccountName(config: ServerlessAzureConfig): string {
    const maxAccountNameLength = 24;
    const nameHash = md5(config.service);
    const replacer = /[^\w]+/g;

    let safePrefix = config.provider.prefix.replace(replacer, "");
    const safeRegion = Utils.createShortAzureRegionName(config.provider.region);
    let safeStage = Utils.createShortStageName(config.provider.stage);
    let safeNameHash = nameHash.substr(0, 6);

    const remaining = maxAccountNameLength - (safePrefix.length + safeRegion.length + safeStage.length + safeNameHash.length);

    // Dynamically adjust the substring based on space needed
    if (remaining < 0) {
      const partLength = Math.floor(Math.abs(remaining) / 3);
      safePrefix = safePrefix.substr(0, partLength);
      safeStage = safeStage.substr(0, partLength);
      safeNameHash = safeNameHash.substr(0, partLength);
    }

    return [safePrefix, safeRegion, safeStage, safeNameHash]
      .join("")
      .toLocaleLowerCase();
  }
}