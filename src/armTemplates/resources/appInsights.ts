import { ArmResourceTemplate, ArmResourceTemplateGenerator, ArmResourceType } from "../../models/armTemplates";
import { ServerlessAzureConfig } from "../../models/serverless";

export class AppInsightsResource implements ArmResourceTemplateGenerator {

  public getArmResourceType(): ArmResourceType {
    return ArmResourceType.AppInsights;
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

  public getParameters(config: ServerlessAzureConfig, namer: (resource: ArmResourceType) => string): any {
    return {
      appInsightsName: namer(this.getArmResourceType()),
    };
  }
}
