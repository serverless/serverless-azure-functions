import { ArmResourceTemplate, ArmResourceTemplateGenerator } from "../../models/armTemplates";
import { FunctionAppConfig, ServerlessAzureConfig } from "../../models/serverless";
import { AzureNamingService } from "../../services/namingService";

//Runtime versions found at " https://<sitename>.scm.azurewebsites.net/api/diagnostics/runtime".
import runtimeVersionsJson from "../../services/runtimeVersions.json";
import semver from "semver";

export class FunctionAppResource implements ArmResourceTemplateGenerator {
  public static getResourceName(config: ServerlessAzureConfig) {
    const safeServiceName = config.service.replace(/\s/g, "-");

    return AzureNamingService.getResourceName(config, config.provider.functionApp, safeServiceName);
  }

  public getTemplate(): ArmResourceTemplate {
    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "functionAppRunFromPackage": {
          "defaultValue": "1",
          "type": "String"
        },
        "functionAppName": {
          "defaultValue": "",
          "type": "String"
        },
        "functionAppNodeVersion": {
          "defaultValue": "",
          "type": "String"
        },
        "functionAppWorkerRuntime": {
          "defaultValue": "node",
          "type": "String"
        },
        "functionAppExtensionVersion": {
          "defaultValue": "~2",
          "type": "String"
        },
        "storageAccountName": {
          "defaultValue": "",
          "type": "String"
        },
        "appInsightsName": {
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
          "type": "Microsoft.Web/sites",
          "apiVersion": "2016-03-01",
          "name": "[parameters('functionAppName')]",
          "location": "[parameters('location')]",
          "identity": {
            "type": "SystemAssigned"
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

  public getParameters(config: ServerlessAzureConfig): any {
    const resourceConfig: FunctionAppConfig = {
      ...config.provider.functionApp,
      nodeVersion: this.getRuntimeVersion(config.provider.runtime)
    };

    return {
      functionAppName: FunctionAppResource.getResourceName(config),
      functionAppNodeVersion: resourceConfig.nodeVersion,
      functionAppWorkerRuntime: resourceConfig.workerRuntime,
      functionAppExtensionVersion: resourceConfig.extensionVersion,
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
