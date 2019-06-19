import * as functionApp from "./resources/functionApp.json";
import * as appInsights from "./resources/appInsights.json";
import * as storage from "./resources/storage.json";
import * as appServicePlan from "./resources/appServicePlan.json";

export function generate() {
  return {
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
}