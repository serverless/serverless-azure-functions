import { ApiManagementConfig } from "../../models/apiManagement";
import { ArmResourceTemplate, ArmResourceTemplateGenerator, ArmParamType, ArmParameters } from "../../models/armTemplates";
import { ServerlessAzureConfig } from "../../models/serverless";
import { AzureNamingService, AzureNamingServiceOptions } from "../../services/namingService";

export class ApimResource implements ArmResourceTemplateGenerator {
  public static getResourceName(config: ServerlessAzureConfig) {
    const options: AzureNamingServiceOptions = {
      config,
      resourceConfig: config.provider.apim,
      suffix: "apim",
    }
    return AzureNamingService.getResourceName(options);
  }

  public getTemplate(): ArmResourceTemplate {
    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "apiManagementName": {
          "defaultValue": "",
          "type": ArmParamType.String
        },
        "location": {
          "defaultValue": "",
          "type": ArmParamType.String
        },
        "apimSkuName": {
          "defaultValue": "Consumption",
          "type": ArmParamType.String
        },
        "apimCapacity": {
          "defaultValue": 0,
          "type": ArmParamType.Int
        },
        "apimPublisherEmail": {
          "defaultValue": "contact@contoso.com",
          "type": ArmParamType.String
        },
        "apimPublisherName": {
          "defaultValue": "Contoso",
          "type": ArmParamType.String
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

  public getParameters(config: ServerlessAzureConfig): ArmParameters {
    const apimConfig: ApiManagementConfig = {
      sku: {},
      ...config.provider.apim,
    };

    return {
      apiManagementName: {
        type: ArmParamType.String,
        value: ApimResource.getResourceName(config),
      },
      apimSkuName: {
        type: ArmParamType.String,
        value: apimConfig.sku.name,
      },
      apimSkuCapacity: {
        type: ArmParamType.Int,
        value: apimConfig.sku.capacity,
      },
      apimPublisherEmail: {
        type: ArmParamType.String,
        value: apimConfig.publisherEmail,
      },
      apimPublisherName: {
        type: ArmParamType.String,
        value: apimConfig.publisherName,
      }
    };
  }
}
