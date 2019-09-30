import { ArmResourceTemplate, ArmResourceTemplateGenerator, ArmParamType, ArmParameters, ArmParameter, DefaultArmParams } from "../../models/armTemplates";
import { ServerlessAzureConfig } from "../../models/serverless";
import { AzureNamingService, AzureNamingServiceOptions } from "../../services/namingService";

interface AppInsightsParams extends DefaultArmParams {
  appInsightsName: ArmParameter;
}

export class AppInsightsResource implements ArmResourceTemplateGenerator {
  public static getResourceName(config: ServerlessAzureConfig) {
    const options: AzureNamingServiceOptions = {
      config,
      resourceConfig: config.provider.appInsights,
      suffix: "appinsights",
    }
    return AzureNamingService.getResourceName(options);
  }

  public getTemplate(): ArmResourceTemplate {
    const parameters: AppInsightsParams = {
      appInsightsName: {
        defaultValue: "",
        type: ArmParamType.String
      },
      location: {
        defaultValue: "",
        type: ArmParamType.String
      }
    }
    
    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      parameters,
      "variables": {},
      "resources": [
        {
          "apiVersion": "2015-05-01",
          "name": "[parameters('appInsightsName')]",
          "type": "microsoft.insights/components",
          "location": "[parameters('location')]",
          "properties": {
            "Application_Type": "web",
            "ApplicationId": "[parameters('appInsightsName')]",
            "Request_Source": "IbizaWebAppExtensionCreate"
          }
        }
      ]
    }
  }

  public getParameters(config: ServerlessAzureConfig): ArmParameters {
    const params: AppInsightsParams = {
      appInsightsName: {
        value: AppInsightsResource.getResourceName(config),
      }
    };

    return params as unknown as ArmParameters;
  }
}
