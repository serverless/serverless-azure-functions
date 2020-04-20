import { configConstants } from "../../config/constants";
import { ArmParameters, ArmParamType, ArmResourceTemplate, ArmResourceTemplateGenerator, DefaultArmParams, ArmParameter } from "../../models/armTemplates";
import { ResourceConfig, ServerlessAzureConfig } from "../../models/serverless";
import { AzureNamingService, AzureNamingServiceOptions } from "../../services/namingService";

interface StorageAccountParams extends DefaultArmParams {
  storageAccountName: ArmParameter;
  storageAccountSkuName: ArmParameter;
  storageAccountSkuTier: ArmParameter;
  storageHttpsTrafficOnly: ArmParameter;
}

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
    const parameters: StorageAccountParams = {
      storageAccountName: {
        defaultValue: "",
        type: ArmParamType.String
      },
      location: {
        defaultValue: "",
        type: ArmParamType.String
      },
      storageAccountSkuName: {
        defaultValue: "Standard_LRS",
        type: ArmParamType.String
      },
      storageAccountSkuTier: {
        defaultValue: "Standard",
        type: ArmParamType.String
      },
      storageHttpsTrafficOnly: {
        defaultValue: false,
        type: ArmParamType.Bool
      },
    }
    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      parameters,
      variables: {},
      resources: [
        {
          apiVersion: "2018-07-01",
          name: "[parameters('storageAccountName')]",
          type: "Microsoft.Storage/storageAccounts",
          location: "[parameters('location')]",
          kind: "Storage",
          properties: {
            accountType: "[parameters('storageAccountSkuName')]",
            supportsHttpsTrafficOnly: "[parameters('storageHttpsTrafficOnly')]"
          },
          sku: {
            name: "[parameters('storageAccountSkuName')]",
            tier: "[parameters('storageAccountSkuTier')]"
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

    const params: StorageAccountParams = {
      storageAccountName: {
        value: StorageAccountResource.getResourceName(config),
      },
      storageAccountSkuName: {
        value: resourceConfig.sku.name,
      },
      storageAccountSkuTier: {
        value: resourceConfig.sku.tier,
      },
      storageHttpsTrafficOnly: {
        value: resourceConfig.httpsTrafficOnly
      },
    };

    return params as unknown as ArmParameters;
  }
}
