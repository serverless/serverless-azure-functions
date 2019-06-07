import { ApiContract, ApiManagementServiceResource } from "@azure/arm-apimanagement/esm/models";
import { Site, FunctionEnvelope } from "@azure/arm-appservice/esm/models";
import { HttpHeaders, HttpOperationResponse, HttpResponse, WebResource } from "@azure/ms-rest-js";
import { AuthResponse, LinkedSubscription, TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { TokenClientCredentials, TokenResponse } from "@azure/ms-rest-nodeauth/dist/lib/credentials/tokenClientCredentials";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import yaml from "js-yaml";
import Serverless from "serverless";
import Service from "serverless/classes/Service";
import Utils from "serverless/classes/Utils";
import PluginManager from "serverless/lib/classes/PluginManager";
import { ServerlessAzureConfig } from "../models/serverless";
import { FunctionMetadata, AzureServiceProvider, ServicePrincipalEnvVariables } from "../models/azureProvider"
import { Logger } from "../models/generic";

function getAttribute(object: any, prop: string, defaultValue: any): any {
  if (object && object[prop]) {
    return object[prop];
  }
  return defaultValue;
}

export class MockFactory {
  public static createTestServerless(config?: any): Serverless {
    const sls = new Serverless(config);
    sls.utils = getAttribute(config, "utils", MockFactory.createTestUtils());
    sls.cli = getAttribute(config, "cli", MockFactory.createTestCli());
    sls.pluginManager = getAttribute(config, "pluginManager", MockFactory.createTestPluginManager());
    sls.variables = getAttribute(config, "variables", MockFactory.createTestVariables());
    sls.service = getAttribute(config, "service", MockFactory.createTestService());
    sls.service.getFunction = jest.fn((functionName) => sls.service["functions"][functionName]);
    return sls;
  }

  public static createTestServerlessOptions(): Serverless.Options {
    return {
      extraServicePath: null,
      function: null,
      noDeploy: null,
      region: null,
      stage: null,
      watch: null,
    };
  }

  public static createTestArmSdkResponse<R>(model: any, statusCode: number): Promise<R> {
    const response: HttpResponse = {
      headers: new HttpHeaders(),
      request: null,
      status: statusCode,
    };

    const result: R = {
      ...model,
      _response: response,
    };

    return Promise.resolve(result);
  }

  public static createTestAuthResponse(): AuthResponse {
    return {
      credentials: MockFactory.createTestVariables()
        .azureCredentials as any as TokenCredentialsBase,
      subscriptions: [
        {
          id: "azureSubId",
        },
      ] as any as LinkedSubscription[],
    };
  }

  public static createTestAzureCredentials(): TokenClientCredentials {
    const credentials = {
      getToken: jest.fn(() => {
        const token: TokenResponse = {
          tokenType: "Bearer",
          accessToken: "ABC123",
        };

        return Promise.resolve(token);
      }),
      signRequest: jest.fn((resource) => Promise.resolve(resource)),
    };

    // TODO: Reduce usage on tokenCache._entries[0]
    credentials["tokenCache"] = {
      _entries: [{ accessToken: "ABC123" }]
    };

    return credentials;
  }

  public static createTestAxiosResponse<T>(
    config: AxiosRequestConfig,
    responseJson: T,
    statusCode: number = 200,
  ): Promise<AxiosResponse> {
    let statusText;
    switch (statusCode) {
      case 200:
        statusText = "OK";
        break;
      case 404:
        statusText = "NotFound";
        break;
    }

    const response: AxiosResponse = {
      config,
      data: JSON.stringify(responseJson),
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      status: statusCode,
      statusText,
    };

    return Promise.resolve(response);
  }

  public static createTestAzureClientResponse<T>(responseJson: T, statusCode: number = 200): Promise<HttpOperationResponse> {
    const response: HttpOperationResponse = {
      request: new WebResource(),
      parsedBody: responseJson,
      bodyAsText: JSON.stringify(responseJson),
      headers: new HttpHeaders(),
      status: statusCode,
    };

    return Promise.resolve(response);
  }

  public static createTestServerlessYml(asYaml = false, functionMetadata?): ServerlessAzureConfig {
    const data = {
      "provider": {
        "name": "azure",
        "location": "West US 2"
      },
      "plugins": [
        "serverless-azure-functions"
      ],
      "functions": functionMetadata || MockFactory.createTestFunctionsMetadata(2),
    }
    return (asYaml) ? yaml.dump(data) : data;
  }

  public static createTestFunctionsMetadata(functionCount = 2) {
    const data = {}
    for (let i = 0; i < functionCount; i++) {
      const functionName = `function${i + 1}`;
      data[functionName] = MockFactory.createTestFunctionMetadata(functionName, `src/handlers/${functionName}.handler`);
    }
    return data;
  }

  public static createTestFunctionMetadata(name: string, handler: string) {
    return {
      handler,
      apim: {
        operations: [
          {
            method: "get",
            urlTemplate: name,
            displayName: name,
          },
        ],
      },
      events: [
        {
          http: true,
          "x-azure-settings": {
            authLevel: "anonymous"
          }
        },
        {
          http: true,
          "x-azure-settings": {
            direction: "out",
            name: "res"
          },
        }
      ]
    };
  }

  public static createTestService(functions?): Service {
    if (!functions) {
      functions = MockFactory.createTestSlsFunctionConfig()
    }
    const serviceName = "serviceName";
    return {
      getAllFunctions: jest.fn(() => Object.keys(functions)),
      getFunction: jest.fn(),
      getAllEventsInFunction: jest.fn(),
      getAllFunctionsNames: jest.fn(() => Object.keys(functions)),
      getEventInFunction: jest.fn(),
      getServiceName: jest.fn(() => serviceName),
      load: jest.fn(),
      mergeResourceArrays: jest.fn(),
      setFunctionNames: jest.fn(),
      update: jest.fn(),
      validate: jest.fn(),
      custom: null,
      provider: MockFactory.createTestAzureServiceProvider(),
      service: serviceName,
      artifact: "app.zip",
      functions
    } as any as Service;
  }

  public static createTestFunctionsResponse(functions?) {
    const result = []
    functions = functions || MockFactory.createTestSlsFunctionConfig();
    for (const name of Object.keys(functions)) {
      result.push({ properties: MockFactory.createTestFunctionEnvelope(name)});
    }
    return result;
  }

  public static createTestAzureServiceProvider(): AzureServiceProvider {
    return {
      resourceGroup: "myResourceGroup",
      deploymentName: "myDeploymentName",
    }
  }

  public static createTestServicePrincipalEnvVariables(): ServicePrincipalEnvVariables {
    return {
      azureSubId: "azureSubId",
      azureServicePrincipalClientId: "azureServicePrincipalClientId",
      azureServicePrincipalPassword: "azureServicePrincipalPassword",
      azureServicePrincipalTenantId: "azureServicePrincipalTenantId",
    }
  }

  public static createTestVariables() {
    return {
      azureCredentials: {
        tokenCache: {
          _entries: [
            {
              accessToken: "token"
            }
          ]
        }
      },
      subscriptionId: "azureSubId",
    }
  }
  
  public static createTestSite(name: string = "Test"): Site {
    return {
      id: "appId",
      name: name,
      location: "West US",
      defaultHostName: "myHostName",
      enabledHostNames: [
        "myHostName"
      ]
    };
  }

  public static createTestFunctionEnvelope(name: string = "TestFunction"): FunctionEnvelope {
    return {
      name,
      config: {
        bindings: MockFactory.createTestBindings()
      }
    }
  }

  public static createTestBindings(bindingCount = 3) {
    const bindings = [];
    for (let i = 0; i < bindingCount; i++) {
      bindings.push(MockFactory.createTestBinding());
    }
    return bindings;
  }

  public static createTestBinding() {
    // Only supporting HTTP for now, could support others
    return MockFactory.createTestHttpBinding();
  }

  public static createTestHttpBinding() {
    return {
      type: "httpTrigger",
      authLevel: "anonymous",
      direction: "in",
      methods: [
        "get",
        "post"
      ]
    }
  }

  public static createTestSlsFunctionConfig() {
    return {
      hello: MockFactory.createTestFunctionMetadata("hello", "src/handlers/hello.handler"),
      goodbye: MockFactory.createTestFunctionMetadata("goodbye", "src/handlers/goodbye.handler"),
    };
  }

  public static createTestApimService(): ApiManagementServiceResource {
    return {
      name: "APIM Service Instance",
      location: "West US",
      publisherName: "Somebody",
      publisherEmail: "somebody@example.com",
      sku: {
        capacity: 0,
        name: "Consumption",
      }
    };
  }

  public static createTestApimApi(): ApiContract {
    return {
      name: "Api1",
      path: "/api1",
    };
  }

  private static createTestUtils(): Utils {
    return {
      appendFileSync: jest.fn(),
      copyDirContentsSync: jest.fn(),
      dirExistsSync: jest.fn(),
      fileExistsSync: jest.fn(),
      findServicePath: jest.fn(),
      generateShortId: jest.fn(),
      getVersion: jest.fn(),
      logStat: jest.fn(),
      readFile: jest.fn(),
      readFileSync: jest.fn((filename) => {
        if (filename === "serverless.yml") {
          return MockFactory.createTestServerlessYml();
        }
      }),
      walkDirSync: jest.fn(),
      writeFile: jest.fn(),
      writeFileDir: jest.fn(),
      writeFileSync: jest.fn(),
    };
  }

  private static createTestCli(): Logger {
    return {
      log: jest.fn(),
    };
  }

  private static createTestPluginManager(): PluginManager {
    return {
      addPlugin: jest.fn(),
      cliCommands: null,
      cliOptions: null,
      commands: null,
      deprecatedEvents: null,
      hooks: null,
      loadAllPlugins: jest.fn(),
      loadCommand: jest.fn(),
      loadCommands: jest.fn(),
      loadCorePlugins: jest.fn(),
      loadPlugins: jest.fn(),
      loadServicePlugins: jest.fn(),
      plugins: null,
      serverless: null,
      setCliCommands: jest.fn(),
      setCliOptions: jest.fn(),
      spawn: jest.fn(),
    };
  }
}
