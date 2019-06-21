import { ServerlessAzureConfig } from "../../models/serverless";
import { ArmResourceTemplateGenerator } from "../../models/armTemplates";
import { ApiManagementConfig } from "../../models/apiManagement";

export const ApimResource: ArmResourceTemplateGenerator = {
  getTemplate: () => {
    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "apiManagementName": {
          "defaultValue": "",
          "type": "String"
        },
        "location": {
          "defaultValue": "",
          "type": "String"
        },
        "apimSkuName": {
          "defaultValue": "Consumption",
          "type": "String"
        },
        "apimCapacity": {
          "defaultValue": 0,
          "type": "int"
        }
      },
      "variables": {},
      "resources": [
        {
          "type": "Microsoft.ApiManagement/service",
          "apiVersion": "2018-06-01-preview",
          "name": "[parameters('apiManagementName')]",
          "location": "[parameters('location')]",
          "sku": {
            "name": "[parameters('apimSkuName')]",
            "capacity": "[parameters('apimCapacity')]"
          },
          "properties": {
            "publisherEmail": "wabrez@microsoft.com",
            "publisherName": "Microsoft",
            "notificationSenderEmail": "apimgmt-noreply@mail.windowsazure.com",
            "hostnameConfigurations": [],
            "virtualNetworkType": "None"
          }
        }
      ]
    };
  },

  getParameters: (config: ServerlessAzureConfig) => {
    const apimConfig: ApiManagementConfig = {
      name: `${config.provider.prefix}-${config.provider.region}-${config.provider.stage}-apim`,
      sku: {},
      ...config.provider.apim,
    };

    return {
      apiManagementName: apimConfig.name,
      apimSkuName: apimConfig.sku.name,
      apimSkuCapacity: apimConfig.sku.capacity,
    };
  }
};