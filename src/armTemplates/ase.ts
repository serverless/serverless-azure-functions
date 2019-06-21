import { FunctionAppResource } from "./resources/functionApp";
import { AppInsightsResource } from "./resources/appInsights";
import { StorageAccountResource } from "./resources/storageAccount";
import { AppServicePlanResource } from "./resources/appServicePlan";
import { HostingEnvironmentResource } from "./resources/hostingEnvironment";
import { VirtualNetworkResource } from "./resources/virtualNetwork";
import { ArmResourceTemplateGenerator } from "../services/armService.js";
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
    const template: any = {
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

    return template;
  },

  getParameters: (config: ServerlessAzureConfig) => {
    let parameters = {};
    resources.forEach((resource) => {
      parameters = {
        ...parameters,
        ...resource.getParameters(config),
      }
    });

    return parameters;
  }
};

export default AseTemplate;