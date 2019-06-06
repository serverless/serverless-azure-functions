import { AuthResponse, LinkedSubscription, TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import yaml from "js-yaml";
import Serverless from "serverless";
import Service from "serverless/classes/Service";
import { AzureServiceProvider, FunctionApp, FunctionMetadata, Logger, 
  ServerlessYml, ServicePrincipalEnvVariables } from "../models";
import Utils from "serverless/classes/Utils";
import PluginManager from "serverless/lib/classes/PluginManager";
import { HttpHeaders, WebResource, HttpOperationResponse, HttpResponse } from "@azure/ms-rest-js";
import { AxiosResponse, AxiosRequestConfig } from "axios";
import { TokenClientCredentials, TokenResponse } from "@azure/ms-rest-nodeauth/dist/lib/credentials/tokenClientCredentials";
import { Site } from "@azure/arm-appservice/esm/models";
import { ApiManagementServiceResource, ApiContract } from "@azure/arm-apimanagement/esm/models";

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

    sls.service.getAllFunctions = jest.fn(() => {
      return Object.keys(sls.service["functions"]);
    })
    sls.service.getAllFunctionsNames = sls.service.getAllFunctions;
    sls.service.getServiceName = jest.fn(() => sls.service["service"]);

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

  public static createTestServerlessYml(asYaml = false, functionMetadata?): ServerlessYml {
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

  public static createTestFunctionsMetadata(functionCount = 2): any {
    const data = {}
    for (let i = 0; i < functionCount; i++) {
      const functionName = `function${i + 1}`;
      data[functionName] = MockFactory.createTestFunctionMetadata()
    }
    return data;
  }

  public static createTestFunctionMetadata(): FunctionMetadata {
    return {
      "handler": "index.handler",
      "events": [
        {
          "http": true,
          "x-azure-settings": {
            "authLevel": "anonymous"
          }
        },
        {
          "http": true,
          "x-azure-settings": {
            "direction": "out",
            "name": "res"
          }
        }
      ]
    }
  }

  public static createTestFunctionApp(name?: string): FunctionApp {
    return {
      id: "App Id",
      name: name || "App Name",
      defaultHostName: "My Host Name"
    }
  }

  public static createTestService(): Service {
    return {
      getAllFunctions: jest.fn(() => MockFactory.createTestFunctions().map((f) => f.name)),
      getFunction: jest.fn(),
      getAllEventsInFunction: jest.fn(),
      getAllFunctionsNames: jest.fn(),
      getEventInFunction: jest.fn(),
      getServiceName: jest.fn(),
      load: jest.fn(),
      mergeResourceArrays: jest.fn(),
      setFunctionNames: jest.fn(),
      update: jest.fn(),
      validate: jest.fn(),
      custom: null,
      provider: MockFactory.createTestAzureServiceProvider(),
      service: "serviceName",
      artifact: "app.zip",
    } as any as Service;
  }

  public static createTestFunctions(functionCount = 3): FunctionApp[] {
    const functions = []
    for (let i = 0; i < functionCount; i++) {
      functions.push(MockFactory.createTestFunctionApp(`function${i + 1}`));
    }
    return functions;
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
      name: name,
      location: "West US",
    };
  }

  public static createTestSlsFunctionConfig() {
    return {
      hello: {
        handler: "index.handler",
        apim: {
          operations: [
            {
              method: "get",
              urlTemplate: "hello",
              displayName: "Hello",
            },
          ],
        },
      },
      goodbye: {
        handler: "index.handler",
        apim: {
          operations: [
            {
              method: "get",
              urlTemplate: "goodbye",
              displayName: "Goodbye",
            },
          ],
        },
      },
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
