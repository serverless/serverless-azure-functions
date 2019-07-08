import { ArmResourceTemplateGenerator, ArmResourceTemplate } from "../../models/armTemplates";
import { ServerlessAzureConfig } from "../../models/serverless";
import { Utils } from "../../shared/utils";

export class AppInsightsResource implements ArmResourceTemplateGenerator {
  public static getResourceName(config: ServerlessAzureConfig) {
    return config.provider.appInsights && config.provider.appInsights.name
      ? config.provider.appInsights.name
      : `${config.provider.prefix}-${Utils.createShortAzureRegionName(config.provider.region)}-${Utils.createShortStageName(config.provider.stage)}-appinsights`;
  }

  public getTemplate(): ArmResourceTemplate {
    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "appInsightsName": {
          "defaultValue": "",
          "type": "String"
        },
        "location": {
          "defaultValue": "",
          "type": "String"
        }
      },
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

  public getParameters(config: ServerlessAzureConfig): any {
    return {
      appInsightsName: AppInsightsResource.getResourceName(config),
    };
  }
}