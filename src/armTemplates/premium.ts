import functionApp from "./resources/functionApp.json";
import appInsights from "./resources/appInsights.json";
import storage from "./resources/storageAccount.json";
import appServicePlan from "./resources/appServicePlan.json";

export function generate() {
  const template = {
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
      ...functionApp.parameters,
      ...appInsights.parameters,
      ...storage.parameters,
      ...appServicePlan.parameters,
    },
    "resources": [
      ...functionApp.resources,
      ...appInsights.resources,
      ...storage.resources,
      ...appServicePlan.resources
    ],
  };

  template.parameters.appServicePlanSkuName.defaultValue = "EP1";
  template.parameters.appServicePlanSkuTier.defaultValue = "ElasticPremium";

  return template;
}