import { ArmParameter, ArmParameters, ArmParamType, ArmResourceTemplate, ArmResourceTemplateGenerator, DefaultArmParams } from "../../models/armTemplates";
import { FunctionAppConfig, ServerlessAzureConfig, SupportedRuntimeLanguage, FunctionAppOS } from "../../models/serverless";
import { AzureNamingService, AzureNamingServiceOptions } from "../../services/namingService";
import configConstants from "../../config";

interface FunctionAppParams extends DefaultArmParams {
  functionAppName: ArmParameter;
  functionAppNodeVersion: ArmParameter;
  functionAppKind: ArmParameter;
  functionAppReserved: ArmParameter;
  linuxFxVersion: ArmParameter;
  functionAppWorkerRuntime: ArmParameter;
  functionAppExtensionVersion: ArmParameter;
  appInsightsName?: ArmParameter;
  functionAppRunFromPackage?: ArmParameter;
  storageAccountName?: ArmParameter;
}

export class FunctionAppResource implements ArmResourceTemplateGenerator {
  public static getResourceName(config: ServerlessAzureConfig) {
    const safeServiceName = config.service.replace(/\s/g, "-");
    const options: AzureNamingServiceOptions = {
      config,
      resourceConfig: config.provider.functionApp,
      suffix: safeServiceName,
      includeHash: false,
    }

    return AzureNamingService.getResourceName(options);
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
      functionAppNodeVersion: {
        defaultValue: "",
        type: ArmParamType.String
      },
      functionAppKind: {
        defaultValue: "functionapp",
        type: ArmParamType.String,
      },
      functionAppReserved: {
        defaultValue: false,
        type: ArmParamType.Bool
      },
      linuxFxVersion : {
        defaultValue: "",
        type: ArmParamType.String,
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
          "kind": "[parameters('functionAppKind')]",
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
            "reserved": "[parameters('functionAppReserved')]",
            "linuxFxVersion": "[parameters('linuxFxVersion')]",
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
    const { functionRuntime, os } = config.provider;
    const isLinuxRuntime = os === FunctionAppOS.LINUX;

    const params: FunctionAppParams = {
      functionAppName: {
        value: FunctionAppResource.getResourceName(config),
      },
      functionAppNodeVersion: {
        value: (functionRuntime.language === SupportedRuntimeLanguage.NODE)
          ?
          functionRuntime.version
          :
          undefined,
      },
      functionAppKind: {
        value: (isLinuxRuntime) ? "functionapp,linux" : undefined,
      },
      functionAppReserved: {
        value: (isLinuxRuntime) ? true : undefined,
      },
      linuxFxVersion: {
        value: (isLinuxRuntime) ? this.getLinuxFxVersion(config) : undefined,
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

  private getLinuxFxVersion(config: ServerlessAzureConfig): string {
    const { functionRuntime } = config.provider;
    const { language, version } = functionRuntime
    const major = (language === SupportedRuntimeLanguage.PYTHON) ? version : version.split(".")[0];
    try {
      return configConstants.dockerImages[language][major]
    } catch (e) {
      throw new Error(`Runtime ${language} ${version} not currently supported by Linux Function Apps`);
    }    
  }
}
