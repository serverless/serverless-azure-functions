import { supportedRuntimes } from "../../config/runtime";
import { FunctionAppOS, Runtime, ServerlessAzureConfig, SupportedRuntimeLanguage } from "../../models/serverless";
import { FunctionAppResource } from "./functionApp";

describe("Function App Resource", () => {

  const resourceGroupName = "myResourceGroup";
  const prefix = "prefix";
  const region = "westus";
  const stage = "prod";

  const defaultConfig: ServerlessAzureConfig = {
    provider: {
      name: "azure",
      prefix,
      region,
      stage,
      resourceGroup: resourceGroupName,
      runtime: Runtime.NODE10,
      functionRuntime: {
        language: SupportedRuntimeLanguage.NODE,
        version: "10"
      }
    },
    service: ""
  } as any;

  it("generates the correct resource name", () => {
    expect(FunctionAppResource.getResourceName(defaultConfig)).toEqual(
      `${defaultConfig.provider.prefix}-wus-${defaultConfig.provider.stage}`
    );
  });

  it("uses the specified name from the azure provider", () => {
    const serviceName = "myapp";

    const config: ServerlessAzureConfig = {
      ...defaultConfig,
      provider: {
        ...defaultConfig.provider,
        functionApp: {
          name: serviceName
        }
      }
    };

    expect(FunctionAppResource.getResourceName(config)).toEqual(serviceName);
  });

  describe("App Settings", () => {
    describe("Linux", () => {
      it("gets correct app settings - python", () => {
        const config = getConfig(FunctionAppOS.LINUX, Runtime.PYTHON36);

        const resource = new FunctionAppResource();
  
        const { appSettings } = resource.getTemplate(config).resources[0].properties.siteConfig;
        expect(appSettings).toEqual([
          {
            name: "FUNCTIONS_WORKER_RUNTIME",
            value: "[parameters('functionAppWorkerRuntime')]"
          },
          {
            name: "FUNCTIONS_EXTENSION_VERSION",
            value: "[parameters('functionAppExtensionVersion')]"
          },
          {
            name: "AzureWebJobsStorage",
            value: "[concat('DefaultEndpointsProtocol=https;AccountName=',parameters('storageAccountName'),';AccountKey=',listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2016-01-01').keys[0].value)]"
          },
          {
            name: "APPINSIGHTS_INSTRUMENTATIONKEY",
            value: "[reference(concat('microsoft.insights/components/', parameters('appInsightsName'))).InstrumentationKey]"
          }
        ]);
      });

      it("gets correct app settings - node", () => {
        const config = getConfig(FunctionAppOS.LINUX, Runtime.NODE10);
    
        const resource = new FunctionAppResource();
  
        const { appSettings } = resource.getTemplate(config).resources[0].properties.siteConfig;
        expect(appSettings).toEqual([
          {
            name: "FUNCTIONS_WORKER_RUNTIME",
            value: "[parameters('functionAppWorkerRuntime')]"
          },
          {
            name: "FUNCTIONS_EXTENSION_VERSION",
            value: "[parameters('functionAppExtensionVersion')]"
          },
          {
            name: "AzureWebJobsStorage",
            value: "[concat('DefaultEndpointsProtocol=https;AccountName=',parameters('storageAccountName'),';AccountKey=',listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2016-01-01').keys[0].value)]"
          },
          {
            name: "APPINSIGHTS_INSTRUMENTATIONKEY",
            value: "[reference(concat('microsoft.insights/components/', parameters('appInsightsName'))).InstrumentationKey]"
          },
          {
            name: "WEBSITE_NODE_DEFAULT_VERSION",
            value: "[parameters('functionAppNodeVersion')]"
          }
        ]);
      });
    });

    describe("Windows", () => {
      it("gets correct app settings - node", () => {
        const config = getConfig(FunctionAppOS.WINDOWS, Runtime.NODE10);
    
        const resource = new FunctionAppResource();
  
        const { appSettings } = resource.getTemplate(config).resources[0].properties.siteConfig;
        expect(appSettings).toEqual([
          {
            name: "FUNCTIONS_WORKER_RUNTIME",
            value: "[parameters('functionAppWorkerRuntime')]"
          },
          {
            name: "FUNCTIONS_EXTENSION_VERSION",
            value: "[parameters('functionAppExtensionVersion')]"
          },
          {
            name: "AzureWebJobsStorage",
            value: "[concat('DefaultEndpointsProtocol=https;AccountName=',parameters('storageAccountName'),';AccountKey=',listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2016-01-01').keys[0].value)]"
          },
          {
            name: "APPINSIGHTS_INSTRUMENTATIONKEY",
            value: "[reference(concat('microsoft.insights/components/', parameters('appInsightsName'))).InstrumentationKey]"
          },
          {
            name: "WEBSITE_CONTENTAZUREFILECONNECTIONSTRING",
            value: "[concat('DefaultEndpointsProtocol=https;AccountName=',parameters('storageAccountName'),';AccountKey=',listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2016-01-01').keys[0].value)]"
          },
          {
            name: "WEBSITE_CONTENTSHARE",
            value: "[toLower(parameters('functionAppName'))]"
          },
          {
            name: "WEBSITE_RUN_FROM_PACKAGE",
            value: "[parameters('functionAppRunFromPackage')]"
          },
          {
            name: "WEBSITE_NODE_DEFAULT_VERSION",
            value: "[parameters('functionAppNodeVersion')]"
          },
        ]);
      });
    });
  });

  describe("Arm Parameters", () => {
    describe("Linux", () => {

      it("gets correct parameters - node 10", () => {
        const config = getConfig(FunctionAppOS.LINUX, Runtime.NODE10);
    
        const resource = new FunctionAppResource();
        
        const params = resource.getParameters(config);
        const { 
          functionAppKind,
          functionAppReserved,
          linuxFxVersion,
          functionAppEnableRemoteBuild,
          functionAppNodeVersion,
        } = params;
    
        expect(functionAppKind.value).toEqual("functionapp,linux");
        expect(functionAppReserved.value).toBe(true)
        expect(linuxFxVersion.value).toEqual("NODE|10");
        expect(functionAppEnableRemoteBuild.value).toBe(true);
        expect(functionAppNodeVersion.value).toEqual("~10");
      });

      it("gets correct parameters - node 12", () => {
        const config = getConfig(FunctionAppOS.LINUX, Runtime.NODE12);
    
        const resource = new FunctionAppResource();
        
        const params = resource.getParameters(config);
        const { 
          functionAppKind,
          functionAppReserved,
          linuxFxVersion,
          functionAppEnableRemoteBuild,
          functionAppNodeVersion,
        } = params;
    
        expect(functionAppKind.value).toEqual("functionapp,linux");
        expect(functionAppReserved.value).toBe(true)
        expect(linuxFxVersion.value).toEqual("NODE|12");
        expect(functionAppEnableRemoteBuild.value).toBe(true);
        expect(functionAppNodeVersion.value).toEqual("~12");
      });

      it("gets correct parameters - python 3.6", () => {
        const config = getConfig(FunctionAppOS.LINUX, Runtime.PYTHON36);
    
        const resource = new FunctionAppResource();
        
        const params = resource.getParameters(config);
        const { 
          functionAppKind,
          functionAppReserved,
          linuxFxVersion,
          functionAppEnableRemoteBuild,
          functionAppNodeVersion,
        } = params;
    
        expect(functionAppKind.value).toEqual("functionapp,linux");
        expect(functionAppReserved.value).toBe(true)
        expect(linuxFxVersion.value).toEqual("PYTHON|3.6");
        expect(functionAppEnableRemoteBuild.value).toBe(true);
        expect(functionAppNodeVersion.value).toBeUndefined();
      });

      it("gets correct parameters - python 3.7", () => {
        const config = getConfig(FunctionAppOS.LINUX, Runtime.PYTHON37);
    
        const resource = new FunctionAppResource();
        
        const params = resource.getParameters(config);
        const { 
          functionAppKind,
          functionAppReserved,
          linuxFxVersion,
          functionAppEnableRemoteBuild,
          functionAppNodeVersion,
        } = params;
    
        expect(functionAppKind.value).toEqual("functionapp,linux");
        expect(functionAppReserved.value).toBe(true)
        expect(linuxFxVersion.value).toEqual("PYTHON|3.7");
        expect(functionAppEnableRemoteBuild.value).toBe(true);
        expect(functionAppNodeVersion.value).toBeUndefined();
      });

      it("gets correct parameters - python 3.8", () => {
        const config = getConfig(FunctionAppOS.LINUX, Runtime.PYTHON38);
    
        const resource = new FunctionAppResource();
        
        const params = resource.getParameters(config);
        const { 
          functionAppKind,
          functionAppReserved,
          linuxFxVersion,
          functionAppEnableRemoteBuild,
          functionAppNodeVersion,
        } = params;
    
        expect(functionAppKind.value).toEqual("functionapp,linux");
        expect(functionAppReserved.value).toBe(true)
        expect(linuxFxVersion.value).toEqual("PYTHON|3.8");
        expect(functionAppEnableRemoteBuild.value).toBe(true);
        expect(functionAppNodeVersion.value).toBeUndefined();
      });
    });

    describe("Windows", () => {
      it("gets correct parameters - node 10", () => {
        const config = getConfig(FunctionAppOS.LINUX, Runtime.NODE10);
    
        const resource = new FunctionAppResource();
        
        const params = resource.getParameters(config);
        const { 
          functionAppKind,
          functionAppReserved,
          linuxFxVersion,
          functionAppEnableRemoteBuild,
        } = params;
    
        expect(functionAppKind.value).toEqual("functionapp,linux");
        expect(functionAppReserved.value).toBe(true)
        expect(linuxFxVersion.value).toEqual("NODE|10");
        expect(functionAppEnableRemoteBuild.value).toBe(true);
      });
    });
  });

  function getConfig(os: FunctionAppOS, runtime: Runtime): ServerlessAzureConfig {
    return {
      ...defaultConfig,
      provider: {
        ...defaultConfig.provider,
        os,
        runtime,
        functionRuntime: supportedRuntimes[runtime],
      }
    }
  }
});
