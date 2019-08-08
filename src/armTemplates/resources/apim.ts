import { ApiManagementConfig } from "../../models/apiManagement";
import { ArmResourceTemplate, ArmResourceTemplateGenerator } from "../../models/armTemplates";
import { ServerlessAzureConfig } from "../../models/serverless";
import { AzureNamingService } from "../../services/namingService";

export class ApimResource implements ArmResourceTemplateGenerator {
  public static getResourceName(config: ServerlessAzureConfig) {
    return AzureNamingService.getResourceName(config, config.provider.apim, "apim");
  }

  public getTemplate(): ArmResourceTemplate {
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
        },
        "apimPublisherEmail": {
          "defaultValue": "contact@contoso.com",
          "type": "String"
        },
        "apimPublisherName": {
          "defaultValue": "Contoso",
          "type": "String"
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
            "publisherEmail": "[parameters('apimPublisherEmail')]",
            "publisherName": "[parameters('apimPublisherName')]",
            "notificationSenderEmail": "apimgmt-noreply@mail.windowsazure.com",
            "hostnameConfigurations": [],
            "virtualNetworkType": "None"
          }
        }
      ]
    };
  }

  public getParameters(config: ServerlessAzureConfig) {
    const apimConfig: ApiManagementConfig = {
      sku: {},
      ...config.provider.apim,
    };

    return {
      apiManagementName: ApimResource.getResourceName(config),
      apimSkuName: apimConfig.sku.name,
      apimSkuCapacity: apimConfig.sku.capacity,
      apimPublisherEmail: apimConfig.publisherEmail,
      apimPublisherName: apimConfig.publisherName,
    };
  }
}
