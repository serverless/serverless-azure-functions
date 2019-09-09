import { ArmResourceTemplate, ArmResourceTemplateGenerator, ArmParamType, ArmParameters } from "../../models/armTemplates";
import { FunctionAppConfig, ServerlessAzureConfig } from "../../models/serverless";
import { AzureNamingService, AzureNamingServiceOptions } from "../../services/namingService";

//Runtime versions found at " https://<sitename>.scm.azurewebsites.net/api/diagnostics/runtime".
import runtimeVersionsJson from "../../services/runtimeVersions.json";
import semver from "semver";

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
    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "functionAppRunFromPackage": {
          "defaultValue": "1",
          "type": ArmParamType.String
        },
        "functionAppName": {
          "defaultValue": "",
          "type": ArmParamType.String
        },
        "functionAppNodeVersion": {
          "defaultValue": "",
          "type": ArmParamType.String
        },
        "functionAppWorkerRuntime": {
          "defaultValue": "node",
          "type": ArmParamType.String
        },
        "functionAppExtensionVersion": {
          "defaultValue": "~2",
          "type": ArmParamType.String
        },
        "storageAccountName": {
          "defaultValue": "",
          "type": ArmParamType.String
        },
        "appInsightsName": {
          "defaultValue": "",
          "type": ArmParamType.String
        },
        "location": {
          "defaultValue": "",
          "type": ArmParamType.String
        },
      },
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
      nodeVersion: this.getRuntimeVersion(config.provider.runtime)
    };

    return {
      functionAppName: {
        value: FunctionAppResource.getResourceName(config),
      },
      functionAppNodeVersion: {
        value: resourceConfig.nodeVersion,
      },
      functionAppWorkerRuntime: {
        value: resourceConfig.workerRuntime,
      },
      functionAppExtensionVersion: {
        value: resourceConfig.extensionVersion,
      }
    };
  }

  private getRuntimeVersion(runtime: string): string {
    if (!runtime) {
      throw new Error("Runtime version not specified in serverless.yml");
    }
    const extractedVersion = runtime.split("nodejs")[1];
    const runtimeVersionsList = runtimeVersionsJson["nodejs"];

    //Searches for a specific version. For example nodejs10.6.0.
    if (!extractedVersion.endsWith(".x")) {
      let retrivedVersion: string;
      for (const version of runtimeVersionsList) {
        retrivedVersion = version["version"];
        if (extractedVersion === retrivedVersion && semver.valid(retrivedVersion)) {
          return retrivedVersion;
        }
      }
    }
    else {
      // User specified something like nodejs10.14.x
      const extractedVersionNumber = extractedVersion.replace(/[^0-9\.]/g, "");

      const selectedVersions = runtimeVersionsList.filter(({ version }) => {
        return version.startsWith(extractedVersionNumber) && semver.valid(version)
      }).map((item) => item.version);

      if (!selectedVersions.length) {
        throw new Error(`Could not find runtime version matching ${runtime}`)
      }
      return selectedVersions.sort(semver.rcompare)[0]
    }
    throw new Error(`Could not find runtime version matching ${runtime}`)
  }
}
