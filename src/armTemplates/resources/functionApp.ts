import { ArmParameter, ArmParameters, ArmParamType, ArmResourceTemplate, ArmResourceTemplateGenerator, DefaultArmParams } from "../../models/armTemplates";
import { FunctionAppConfig, ServerlessAzureConfig, SupportedRuntimeLanguage } from "../../models/serverless";
import { AzureNamingService, AzureNamingServiceOptions } from "../../services/namingService";

interface FunctionAppParams extends DefaultArmParams {
  functionAppName: ArmParameter;
  functionAppNodeVersion: ArmParameter;
  functionAppWorkerRuntime: ArmParameter;
  functionAppExtensionVersion: ArmParameter;
  appInsightsName?: ArmParameter;
  functionAppRunFromPackage?: ArmParameter;
  storageAccountName?: ArmParameter;
}

export class FunctionAppResource implements ArmResourceTemplateGenerator {
  public static getResourceName(config: ServerlessAzureConfig, deploymentSlot?: string) {
    const safeServiceName = config.service.replace(/\s/g, "-");
    const options: AzureNamingServiceOptions = {
      config,
      resourceConfig: config.provider.functionApp,
      suffix: safeServiceName,
      includeHash: false,
    }

    const name = (deploymentSlot && !["prod", "production"].includes(deploymentSlot)) 
      ? `${AzureNamingService.getResourceName(options)}/slots/${deploymentSlot}` 
      : AzureNamingService.getResourceName(options);
    return name;
  }

  public static getFunctionSlot(config: ServerlessAzureConfig) {
    const safeSlotName = (config.provider.functionApp && config.provider.functionApp.slot) ? config.provider.functionApp.slot.replace(/\s/g, "-") : null;
    return safeSlotName;
  }

  public getTemplate(): ArmResourceTemplate {
    const parameters: FunctionAppParams = {
      functionAppRunFromPackage: {
        defaultValue: "1",
        type: ArmParamType.String
      },
      functionAppName: {
        defaultValue: "",
        type: ArmParamType.String
      },
      functionAppSlot: {
        defaultValue: "",
        type: ArmParamType.String
      },
      functionAppNodeVersion: {
        defaultValue: "",
        type: ArmParamType.String
      },
      functionAppWorkerRuntime: {
        defaultValue: "node",
        type: ArmParamType.String
      },
      functionAppExtensionVersion: {
        defaultValue: "~2",
        type: ArmParamType.String
      },
      storageAccountName: {
        defaultValue: "",
        type: ArmParamType.String
      },
      appInsightsName: {
        defaultValue: "",
        type: ArmParamType.String
      },
      location: {
        defaultValue: "",
        type: ArmParamType.String
      },
    }
    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      parameters,
      "variables": {},
      "resources": [
        {
          "type": "Microsoft.Web/sites/slots",
          "apiVersion": "2016-03-01",
          "name": "[concat(parameters('functionAppName'), '/', parameters('functionAppSlot'))]",
          "location": "[parameters('location')]",
          "kind": "functionapp",
          "identity": {
            "type": ArmParamType.SystemAssigned
          },
          "dependsOn": [
            "[resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName'))]",
            "[concat('microsoft.insights/components/', parameters('appInsightsName'))]",
            "[resourceId('Microsoft.Web/Sites', parameters('functionAppName'))]"
          ],
          "properties": {
            "siteConfig": {
              "appSettings": [
                {
                  "name": "FUNCTIONS_WORKER_RUNTIME",
                  "value": "[parameters('functionAppWorkerRuntime')]"
                },
                {
                  "name": "FUNCTIONS_EXTENSION_VERSION",
                  "value": "[parameters('functionAppExtensionVersion')]"
                },
                {
                  "name": "AzureWebJobsStorage",
                  "value": "[concat('DefaultEndpointsProtocol=https;AccountName=',parameters('storageAccountName'),';AccountKey=',listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2016-01-01').keys[0].value)]"
                },
                {
                  "name": "WEBSITE_CONTENTAZUREFILECONNECTIONSTRING",
                  "value": "[concat('DefaultEndpointsProtocol=https;AccountName=',parameters('storageAccountName'),';AccountKey=',listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2016-01-01').keys[0].value)]"
                },
                {
                  "name": "WEBSITE_CONTENTSHARE",
                  "value": "[concat(toLower(parameters('functionAppName')), '-', parameters('functionAppSlot'))]"
                },
                {
                  "name": "WEBSITE_NODE_DEFAULT_VERSION",
                  "value": "[parameters('functionAppNodeVersion')]"
                },
                {
                  "name": "WEBSITE_RUN_FROM_PACKAGE",
                  "value": "[parameters('functionAppRunFromPackage')]"
                },
                {
                  "name": "APPINSIGHTS_INSTRUMENTATIONKEY",
                  "value": "[reference(concat('microsoft.insights/components/', parameters('appInsightsName'))).InstrumentationKey]"
                }
              ]
            },
            "name": "[concat(parameters('functionAppName'), '(', parameters('functionAppSlot'), ')')]",
            "clientAffinityEnabled": false,
            "hostingEnvironment": ""
          }
        },
        {
          "type": "Microsoft.Web/sites",
          "apiVersion": "2016-03-01",
          "name": "[parameters('functionAppName')]",
          "location": "[parameters('location')]",
          "identity": {
            "type": ArmParamType.SystemAssigned
          },
          "dependsOn": [
            "[resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName'))]",
            "[concat('microsoft.insights/components/', parameters('appInsightsName'))]"
          ],
          "kind": "functionapp",
          "properties": {
            "siteConfig": {
              "appSettings": [
                {
                  "name": "FUNCTIONS_WORKER_RUNTIME",
                  "value": "[parameters('functionAppWorkerRuntime')]"
                },
                {
                  "name": "FUNCTIONS_EXTENSION_VERSION",
                  "value": "[parameters('functionAppExtensionVersion')]"
                },
                {
                  "name": "AzureWebJobsStorage",
                  "value": "[concat('DefaultEndpointsProtocol=https;AccountName=',parameters('storageAccountName'),';AccountKey=',listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2016-01-01').keys[0].value)]"
                },
                {
                  "name": "WEBSITE_CONTENTAZUREFILECONNECTIONSTRING",
                  "value": "[concat('DefaultEndpointsProtocol=https;AccountName=',parameters('storageAccountName'),';AccountKey=',listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2016-01-01').keys[0].value)]"
                },
                {
                  "name": "WEBSITE_CONTENTSHARE",
                  "value": "[toLower(parameters('functionAppName'))]"
                },
                {
                  "name": "WEBSITE_NODE_DEFAULT_VERSION",
                  "value": "[parameters('functionAppNodeVersion')]"
                },
                {
                  "name": "WEBSITE_RUN_FROM_PACKAGE",
                  "value": "[parameters('functionAppRunFromPackage')]"
                },
                {
                  "name": "APPINSIGHTS_INSTRUMENTATIONKEY",
                  "value": "[reference(concat('microsoft.insights/components/', parameters('appInsightsName'))).InstrumentationKey]"
                }
              ]
            },
            "name": "[parameters('functionAppName')]",
            "clientAffinityEnabled": false,
            "hostingEnvironment": ""
          }
        }
      ]
    };
  }

  public getParameters(config: ServerlessAzureConfig): ArmParameters {
    const resourceConfig: FunctionAppConfig = {
      ...config.provider.functionApp,
    };
    const { functionRuntime } = config.provider;


    const params: FunctionAppParams = {
      functionAppName: {
        value: FunctionAppResource.getResourceName(config),
      },
      functionAppSlot: {
        value: FunctionAppResource.getFunctionSlot(config),
      },
      functionAppNodeVersion: {
        value: (functionRuntime.language === SupportedRuntimeLanguage.NODE)
          ?
          functionRuntime.version
          :
          undefined
      },
      functionAppWorkerRuntime: {
        value: functionRuntime.language,
      },
      functionAppExtensionVersion: {
        value: resourceConfig.extensionVersion,
      }
    };

    return params as unknown as ArmParameters;
  }
}
