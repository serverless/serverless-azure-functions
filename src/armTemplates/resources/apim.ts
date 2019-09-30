import { ApiManagementConfig } from "../../models/apiManagement";
import { ArmResourceTemplate, ArmResourceTemplateGenerator, ArmParamType, ArmParameters, ArmParameter, DefaultArmParams } from "../../models/armTemplates";
import { ServerlessAzureConfig } from "../../models/serverless";
import { AzureNamingService, AzureNamingServiceOptions } from "../../services/namingService";

interface ApimArmParams extends DefaultArmParams {
  apiManagementName: ArmParameter;
  apimSkuName: ArmParameter;
  apimSkuCapacity: ArmParameter;
  apimPublisherEmail: ArmParameter;
  apimPublisherName: ArmParameter;
}

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
    const parameters: ApimArmParams = {
      apiManagementName: {
        defaultValue: "",
        type: ArmParamType.String
      },
      location: {
        defaultValue: "",
        type: ArmParamType.String
      },
      apimSkuName: {
        defaultValue: "Consumption",
        type: ArmParamType.String
      },
      apimSkuCapacity: {
        defaultValue: 0,
        type: ArmParamType.Int
      },
      apimPublisherEmail: {
        defaultValue: "contact@contoso.com",
        type: ArmParamType.String
      },
      apimPublisherName: {
        defaultValue: "Contoso",
        type: ArmParamType.String
      }
    }
    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      parameters,
      "variables": {},
      "resources": [
        {
          "type": "Microsoft.ApiManagement/service",
          "apiVersion": "2018-06-01-preview",
          "name": "[parameters('apiManagementName')]",
          "location": "[parameters('location')]",
          "sku": {
            "name": "[parameters('apimSkuName')]",
            "capacity": "[parameters('apimSkuCapacity')]"
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

    const parameters: ApimArmParams =  {
      apiManagementName: {
        value: ApimResource.getResourceName(config),
      },
      apimSkuName: {
        value: apimConfig.sku.name,
      },
      apimSkuCapacity: {
        value: apimConfig.sku.capacity,
      },
      apimPublisherEmail: {
        value: apimConfig.publisherEmail,
      },
      apimPublisherName: {
        value: apimConfig.publisherName,
      }
    };

    return parameters as unknown as ArmParameters;
  }
}
