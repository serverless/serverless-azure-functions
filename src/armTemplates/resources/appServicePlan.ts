import { ArmResourceTemplate, ArmResourceTemplateGenerator, ArmParamType, ArmParameters, DefaultArmParams, ArmParameter } from "../../models/armTemplates";
import { ResourceConfig, ServerlessAzureConfig, FunctionAppOS } from "../../models/serverless";
import { AzureNamingService, AzureNamingServiceOptions } from "../../services/namingService";

interface AppServicePlanParams extends DefaultArmParams {
  appServicePlanName: ArmParameter;
  kind: ArmParameter;
  appServicePlanSkuName: ArmParameter;
  appServicePlanSkuTier: ArmParameter;
  appServicePlanWorkerSizeId: ArmParameter;
  appServicePlanMinWorkerCount: ArmParameter;
  appServicePlanMaxWorkerCount: ArmParameter;
  appServicePlanHostingEnvironment: ArmParameter;
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
      },
      appServicePlanWorkerSizeId: {
        defaultValue: "3",
        type: ArmParamType.String
      },
      appServicePlanMinWorkerCount: {
        defaultValue: 1,
        type: ArmParamType.Int,
      },
      appServicePlanMaxWorkerCount: {
        defaultValue: 10,
        type: ArmParamType.Int
      },
      appServicePlanHostingEnvironment: {
        defaultValue: "",
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
            "workerSizeId": "[parameters('appServicePlanWorkerSizeId')]",
            "numberOfWorkers": "[parameters('appServicePlanMinWorkerCount')]",
            "maximumElasticWorkerCount": "[parameters('appServicePlanMaxWorkerCount')]",
            "hostingEnvironment": "[parameters('appServicePlanHostingEnvironment')]"
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
      scale: {},
      ...config.provider.appServicePlan,
    };

    const { os } = config.provider;

    const params: AppServicePlanParams = {
      appServicePlanName: {
        value: AppServicePlanResource.getResourceName(config),
      },
      /**
       * `kind` only required for Linux Function Apps
       * `undefined` values get removed from parameters by armService
       * before deployment
       */
      kind: {
        value: (os === FunctionAppOS.LINUX) ? "Linux" : undefined,
      },
      appServicePlanSkuName: {
        value: resourceConfig.sku.name,
      },
      appServicePlanSkuTier: {
        value: resourceConfig.sku.tier,
      },
      appServicePlanWorkerSizeId: {
        value: resourceConfig.scale.workerSizeId
      },
      appServicePlanMinWorkerCount: {
        value: resourceConfig.scale.minWorkerCount
      },
      appServicePlanMaxWorkerCount: {
        value: resourceConfig.scale.maxWorkerCount
      },
      appServicePlanHostingEnvironment: {
        value: resourceConfig.hostingEnvironment
      }
    }

    return params;
  }
}
