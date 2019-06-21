import { FunctionAppResource } from "./resources/functionApp";
import { AppInsightsResource } from "./resources/appInsights";
import { StorageAccountResource } from "./resources/storageAccount";
import { AppServicePlanResource } from "./resources/appServicePlan";
import { HostingEnvironmentResource } from "./resources/hostingEnvironment";
import { VirtualNetworkResource } from "./resources/virtualNetwork";
import { ArmResourceTemplateGenerator, ArmResourceTemplate } from "../models/armTemplates";
import { ServerlessAzureConfig } from "../models/serverless.js";

const resources: ArmResourceTemplateGenerator[] = [
  FunctionAppResource,
  AppInsightsResource,
  StorageAccountResource,
  AppServicePlanResource,
  HostingEnvironmentResource,
  VirtualNetworkResource,
];

const AseTemplate: ArmResourceTemplateGenerator = {
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

    template.parameters.appServicePlanSkuName.defaultValue = "I1";
    template.parameters.appServicePlanSkuTier.defaultValue = "Isolated";

    // Update the app service plan to point to the hosting environment
    const appServicePlan: any = template.resources.find((resource: any) => resource.type === "Microsoft.Web/serverfarms");
    if (appServicePlan) {
      appServicePlan.dependsOn = [...(appServicePlan.dependsOn || []), "[resourceId('Microsoft.Web/hostingEnvironments', parameters('hostingEnvironmentName'))]"];
      appServicePlan.properties.hostingEnvironmentProfile = {
        ...appServicePlan.properties.hostingEnvironmentProfile,
        id: "[resourceId('Microsoft.Web/hostingEnvironments', parameters('hostingEnvironmentName'))]",
      }
    }

    // Update the functionApp resource to include the app service plan references
    const app: any = template.resources.find((resource: any) => resource.type === "Microsoft.Web/sites");
    if (app) {
      app.dependsOn = [...(app.dependsOn || []), "[concat('Microsoft.Web/serverfarms/', parameters('appServicePlanName'))]"];
      app.properties.serverFarmId = "[resourceId('Microsoft.Web/serverfarms', parameters('appServicePlanName'))]";
      app.properties.hostingEnvironmentProfile = {
        ...app.properties.hostingEnvironmentProfile,
        id: "[resourceId('Microsoft.Web/hostingEnvironments', parameters('hostingEnvironmentName'))]",
      }
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

export default AseTemplate;