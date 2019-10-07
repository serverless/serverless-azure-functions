import { FunctionAppResource } from "./functionApp";
import { ServerlessAzureConfig, FunctionAppOS, SupportedRuntimeLanguage } from "../../models/serverless";

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
      functionRuntime: {
        language: SupportedRuntimeLanguage.NODE,
        version: "10.6.0"
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

  describe("Linux parameters", () => {
    it("gets correct parameters - node 10", () => {
      const config: ServerlessAzureConfig = {
        ...defaultConfig,
        provider: {
          ...defaultConfig.provider,
          os: FunctionAppOS.LINUX
        }
      }
  
      const resource = new FunctionAppResource();
      
      const params = resource.getParameters(config);
      const { 
        functionAppKind,
        functionAppReserved,
        linuxFxVersion
      } = params;
  
      expect(functionAppKind.value).toEqual("functionapp,linux");
      expect(functionAppReserved.value).toBe(true)
      expect(linuxFxVersion.value).toEqual("DOCKER|microsoft/azure-functions/node:2.0");
    });
  
    it("gets correct linux parameters - node 8", () => {
      const config: ServerlessAzureConfig = {
        ...defaultConfig,
        provider: {
          ...defaultConfig.provider,
          os: FunctionAppOS.LINUX,
          functionRuntime: {
            language: SupportedRuntimeLanguage.NODE,
            version: "8.11.1",
          }
        }
      }
  
      const resource = new FunctionAppResource();
      
      const params = resource.getParameters(config);
      const { 
        functionAppKind,
        functionAppReserved,
        linuxFxVersion
      } = params;
  
      expect(functionAppKind.value).toEqual("functionapp,linux");
      expect(functionAppReserved.value).toBe(true)
      expect(linuxFxVersion.value).toEqual("DOCKER|microsoft/azure-functions-node8:2.0");
    });

    it("gets correct linux parameters - python 3.6", () => {
      const config: ServerlessAzureConfig = {
        ...defaultConfig,
        provider: {
          ...defaultConfig.provider,
          os: FunctionAppOS.LINUX,
          functionRuntime: {
            language: SupportedRuntimeLanguage.PYTHON,
            version: "3.6",
          }
        }
      }
  
      const resource = new FunctionAppResource();
      
      const params = resource.getParameters(config);
      const { 
        functionAppKind,
        functionAppReserved,
        linuxFxVersion
      } = params;
  
      expect(functionAppKind.value).toEqual("functionapp,linux");
      expect(functionAppReserved.value).toBe(true)
      expect(linuxFxVersion.value).toEqual("DOCKER|microsoft/azure-functions/python:2.0");
    });
  });
});
