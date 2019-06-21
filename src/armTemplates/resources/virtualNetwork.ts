import { ArmResourceTemplateGenerator } from "../../models/armTemplates";
import { ServerlessAzureConfig, ResourceConfig } from "../../models/serverless";

export const VirtualNetworkResource: ArmResourceTemplateGenerator = {
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
          "type": "Microsoft.Network/virtualNetworks",
          "apiVersion": "2018-12-01",
          "name": "[parameters('virtualNetworkName')]",
          "location": "[parameters('location')]",
          "properties": {
            "provisioningState": "Succeeded",
            "resourceGuid": "b756ff30-43ac-4e83-9794-13011e7884ba",
            "addressSpace": {
              "addressPrefixes": [
                "172.17.0.0/16"
              ]
            },
            "subnets": [
              {
                "name": "default",
                "etag": "W/\"73e9f4aa-86a9-478e-ad11-2db211c9c2e3\"",
                "properties": {
                  "provisioningState": "Succeeded",
                  "addressPrefix": "172.17.0.0/24",
                  "resourceNavigationLinks": [
                    {
                      "name": "[concat('MicrosoftWeb_HostingEnvironments_', parameters('hostingEnvironmentName'))]",
                      "properties": {
                        "linkedResourceType": "Microsoft.Web/hostingEnvironments",
                        "link": "[resourceId('Microsoft.Web/hostingEnvironments', parameters('hostingEnvironmentName'))]"
                      }
                    }
                  ],
                  "serviceEndpoints": [
                    {
                      "provisioningState": "Succeeded",
                      "service": "Microsoft.Web",
                      "locations": [
                        "*"
                      ]
                    }
                  ],
                  "delegations": []
                }
              }
            ],
            "virtualNetworkPeerings": [],
            "enableDdosProtection": false,
            "enableVmProtection": false
          }
        }
      ]
    };
  },

  getParameters: (config: ServerlessAzureConfig) => {
    const resourceConfig: ResourceConfig = {
      name: `${config.provider.prefix}-${config.provider.region}-${config.provider.stage}-vnet`,
      ...config.provider.hostingEnvironment,
    };
    
    return {
      virtualNetworkName: resourceConfig.name,
    }
  }
};

