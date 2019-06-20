import functionApp from "./resources/functionApp.json";
import appInsights from "./resources/appInsights.json";
import storage from "./resources/storageAccount.json";

export function generate() {
  const template = {
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
      ...functionApp.parameters,
      ...appInsights.parameters,
      ...storage.parameters,
    },
    "resources": [
      ...functionApp.resources,
      ...appInsights.resources,
      ...storage.resources,
    ],
  };

  return template;
}