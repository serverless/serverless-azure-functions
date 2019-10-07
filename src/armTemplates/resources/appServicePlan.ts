import { ArmResourceTemplate, ArmResourceTemplateGenerator, ArmParamType, ArmParameters, DefaultArmParams, ArmParameter } from "../../models/armTemplates";
import { ResourceConfig, ServerlessAzureConfig, FunctionAppOS } from "../../models/serverless";
import { AzureNamingService, AzureNamingServiceOptions } from "../../services/namingService";

interface AppServicePlanParams extends DefaultArmParams {
  appServicePlanName: ArmParameter;
  kind: ArmParameter;
  appServicePlanSkuName: ArmParameter;
  appServicePlanSkuTier: ArmParameter;
}

export class AppServicePlanResource implements ArmResourceTemplateGenerator {
  public static getResourceName(config: ServerlessAzureConfig) {
    const options: AzureNamingServiceOptions = {
      config,
      resourceConfig: config.provider.appServicePlan,
      suffix: "asp",
    }
    return AzureNamingService.getResourceName(options);
  }

  public getTemplate(): ArmResourceTemplate {
    const parameters: AppServicePlanParams = {
      appServicePlanName: {
        defaultValue: "",
        type: ArmParamType.String
      },
      kind: {
        defaultValue: "",
        type: ArmParamType.String,
      },
      location: {
        defaultValue: "",
        type: ArmParamType.String
      },
      appServicePlanSkuName: {
        defaultValue: "EP1",
        type: ArmParamType.String
      },
      appServicePlanSkuTier: {
        defaultValue: "ElasticPremium",
        type: ArmParamType.String
      }
    };

    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      parameters,
      "variables": {},
      "resources": [
        {
          "apiVersion": "2016-09-01",
          "name": "[parameters('appServicePlanName')]",
          "type": "Microsoft.Web/serverfarms",
          "location": "[parameters('location')]",
          "kind": "[parameters('kind')]",
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

  public getParameters(config: ServerlessAzureConfig): ArmParameters {
    const resourceConfig: ResourceConfig = {
      sku: {},
      ...config.provider.storageAccount,
    };

    const { os } = config.provider;

    const params: AppServicePlanParams = {
      appServicePlanName: {
        value: AppServicePlanResource.getResourceName(config),
      },
      kind: {
        value: (os === FunctionAppOS.LINUX) ? "Linux" : undefined,
      },
      appServicePlanSkuName: {
        value: resourceConfig.sku.name,
      },
      appServicePlanSkuTier: {
        value: resourceConfig.sku.tier,
      }
    }

    return params as unknown as ArmParameters;
  }
}
