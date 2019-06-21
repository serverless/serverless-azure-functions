import { FunctionAppResource } from "./resources/functionApp";
import { AppInsightsResource } from "./resources/appInsights";
import { StorageAccountResource } from "./resources/storageAccount";
import { AppServicePlanResource } from "./resources/appServicePlan";
import { ArmResourceTemplateGenerator, ArmResourceTemplate } from "../services/armService.js";
import { ServerlessAzureConfig } from "../models/serverless";

const resources: ArmResourceTemplateGenerator[] = [
  FunctionAppResource,
  AppInsightsResource,
  StorageAccountResource,
  AppServicePlanResource,
];

const PremiumTemplate: ArmResourceTemplateGenerator = {
  getTemplate: () => {
    const template: ArmResourceTemplate = {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {},
      "resources": [],
    };

    resources.forEach((resource) => {
      const resourceTemplate = resource.getTemplate();
      template.parameters = {
        ...template.parameters,
        ...resourceTemplate.parameters,
      };

      template.resources = [
        ...template.resources,
        ...resourceTemplate.resources,
      ];
    });

    template.parameters.appServicePlanSkuName.defaultValue = "EP1";
    template.parameters.appServicePlanSkuTier.defaultValue = "ElasticPremium";

    // Update the functionApp resource to include the app service plan references
    const app: any = template.resources.find((resource: any) => resource.type === "Microsoft.Web/sites");
    if (app) {
      app.properties.serverFarmId = "[resourceId('Microsoft.Web/serverfarms', parameters('appServicePlanName'))]";
      app.dependsOn.push("[concat('Microsoft.Web/serverfarms/', parameters('appServicePlanName'))]")
    }

    return template;
  },

  getParameters: (config: ServerlessAzureConfig) => {
    let parameters = {};
    resources.forEach((resource) => {
      parameters = {
        ...parameters,
        ...resource.getParameters(config),
        location: config.provider.region,
      }
    });

    return parameters;
  }
};

export default PremiumTemplate;