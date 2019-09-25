import { ArmResourceTemplate, ArmResourceTemplateGenerator, ArmParamType, ArmParameters, DefaultArmParams, ArmParameter } from "../../models/armTemplates";
import { ServerlessAzureConfig } from "../../models/serverless";
import { AzureNamingService, AzureNamingServiceOptions } from "../../services/namingService";

export interface HostingEnvironmentParams extends DefaultArmParams {
  hostingEnvironmentName?: ArmParameter;
  virtualNetworkName?: ArmParameter;
}

export class HostingEnvironmentResource implements ArmResourceTemplateGenerator {
  public static getResourceName(config: ServerlessAzureConfig) {
    const options: AzureNamingServiceOptions = {
      config,
      resourceConfig: config.provider.hostingEnvironment,
      suffix: "ase",
    }
    return AzureNamingService.getResourceName(options);
  }

  public getTemplate(): ArmResourceTemplate {
    const parameters: HostingEnvironmentParams = {
      hostingEnvironmentName: {
        defaultValue: "",
        type: ArmParamType.String
      },
      virtualNetworkName: {
        defaultValue: "",
        type: ArmParamType.String
      },
      location: {
        defaultValue: "",
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
          "type": "Microsoft.Web/hostingEnvironments",
          "apiVersion": "2016-09-01",
          "name": "[parameters('hostingEnvironmentName')]",
          "location": "[parameters('location')]",
          "dependsOn": [
            "[resourceId('Microsoft.Network/virtualNetworks', parameters('virtualNetworkName'))]"
          ],
          "kind": "ASEV2",
          "zones": [],
          "properties": {
            "name": "[parameters('hostingEnvironmentName')]",
            "location": "[parameters('location')]",
            "vnetName": "[parameters('virtualNetworkName')]",
            "vnetResourceGroupName": "[resourceGroup().name]",
            "vnetSubnetName": "default",
            "virtualNetwork": {
              "id": "[resourceId('Microsoft.Network/virtualNetworks', parameters('virtualNetworkName'))]",
              "subnet": "default"
            },
            "internalLoadBalancingMode": "None",
            "multiSize": "Standard_D1_V2",
            "multiRoleCount": 2,
            "ipsslAddressCount": 2,
            "networkAccessControlList": [],
            "frontEndScaleFactor": 15,
            "suspended": false
          }
        }
      ]
    };
  }

  public getParameters(config: ServerlessAzureConfig): ArmParameters {
    const params: HostingEnvironmentParams = {
      hostingEnvironmentName: {
        value: HostingEnvironmentResource.getResourceName(config)
      }
    }

    return params as unknown as ArmParameters;
  }
}

