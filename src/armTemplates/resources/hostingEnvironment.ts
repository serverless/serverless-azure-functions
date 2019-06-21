import { ArmResourceTemplateGenerator } from "../../models/armTemplates";
import { ServerlessAzureConfig, ResourceConfig } from "../../models/serverless";

export const HostingEnvironmentResource: ArmResourceTemplateGenerator = {
  getTemplate: () => {
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
            "dnsSuffix": "[concat(parameters('hostingEnvironmentName'), '.p.azurewebsites.net')]",
            "networkAccessControlList": [],
            "frontEndScaleFactor": 15,
            "suspended": false
          }
        }
      ]
    };
  },

  getParameters: (config: ServerlessAzureConfig) => {
    const resourceConfig: ResourceConfig = {
      name: `${config.provider.prefix}-${config.provider.region}-${config.provider.stage}-ase`,
      ...config.provider.hostingEnvironment,
    };
    
    return {
      hostingEnvironmentName: resourceConfig.name,
    }
  }
};

