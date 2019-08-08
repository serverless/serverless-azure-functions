import { ArmResourceTemplate, ArmResourceTemplateGenerator } from "../../models/armTemplates";
import { ServerlessAzureConfig } from "../../models/serverless";
import { AzureNamingService } from "../../services/namingService";

export class HostingEnvironmentResource implements ArmResourceTemplateGenerator {
  public static getResourceName(config: ServerlessAzureConfig) {
    return AzureNamingService.getResourceName(config, config.provider.hostingEnvironment, "ase");
  }

  public getTemplate(): ArmResourceTemplate {
    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "hostingEnvironmentName": {
          "defaultValue": "",
          "type": "String"
        },
        "virtualNetworkName": {
          "defaultValue": "",
          "type": "String"
        },
        "location": {
          "defaultValue": "",
          "type": "String"
        }
      },
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

  public getParameters(config: ServerlessAzureConfig): any {
    return {
      hostingEnvironmentName: HostingEnvironmentResource.getResourceName(config)
    }
  }
}

