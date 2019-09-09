import configConstants from "../../config";
import { ArmParameters, ArmParamType, ArmResourceTemplate, ArmResourceTemplateGenerator } from "../../models/armTemplates";
import { ResourceConfig, ServerlessAzureConfig } from "../../models/serverless";
import { AzureNamingService, AzureNamingServiceOptions } from "../../services/namingService";

export class StorageAccountResource implements ArmResourceTemplateGenerator {
  public static getResourceName(config: ServerlessAzureConfig) {
    const options: AzureNamingServiceOptions = {
      config,
      resourceConfig: config.provider.storageAccount,
      suffix: ""
    };
    return AzureNamingService.getSafeResourceName({
      ...options,
      maxLength: configConstants.naming.maxLength.storageAccount
    });
  }

  public getTemplate(): ArmResourceTemplate {
    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "storageAccountName": {
          "defaultValue": "",
          "type": ArmParamType.String
        },
        "location": {
          "defaultValue": "",
          "type": ArmParamType.String
        },
        "storageAccountSkuName": {
          "defaultValue": "Standard_LRS",
          "type": ArmParamType.String
        },
        "storageAccoutSkuTier": {
          "defaultValue": "Standard",
          "type": ArmParamType.String
        }
      },
      variables: {},
      resources: [
        {
          apiVersion: "2018-07-01",
          name: "[parameters('storageAccountName')]",
          type: "Microsoft.Storage/storageAccounts",
          location: "[parameters('location')]",
          kind: "Storage",
          properties: {
            accountType: "[parameters('storageAccountSkuName')]"
          },
          sku: {
            name: "[parameters('storageAccountSkuName')]",
            tier: "[parameters('storageAccoutSkuTier')]"
          }
        }
      ]
    };
  }

  public getParameters(config: ServerlessAzureConfig): ArmParameters {
    const resourceConfig: ResourceConfig = {
      sku: {},
      ...config.provider.storageAccount
    };

    return {
      storageAccountName: {
        value: StorageAccountResource.getResourceName(config),
      },
      storageAccountSkuName: {
        value: resourceConfig.sku.name,
      },
      storageAccoutSkuTier: {
        value: resourceConfig.sku.tier,
      }
    };
  }
}
