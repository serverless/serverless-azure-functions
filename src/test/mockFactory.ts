import { AuthResponse, LinkedSubscription, TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import yaml from "js-yaml";
import Serverless from "serverless";
import Utils from "serverless/classes/Utils";
import PluginManager from "serverless/lib/classes/PluginManager";
import { HttpHeaders, WebResource, HttpOperationResponse, HttpResponse } from "@azure/ms-rest-js";
import { AxiosResponse, AxiosRequestConfig } from "axios";
import { TokenClientCredentials, TokenResponse } from "@azure/ms-rest-nodeauth/dist/lib/credentials/tokenClientCredentials";
import { Site } from "@azure/arm-appservice/esm/models";

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
      credentials: "credentials" as any as TokenCredentialsBase,
      subscriptions: [
        {
          id: "azureSubId",
        },
      ] as any as LinkedSubscription[],
    };
  }

  public static createTestAzureCredentials(): TokenClientCredentials {
    return {
      getToken: jest.fn(() => {
        const token: TokenResponse = {
          tokenType: "Bearer",
          accessToken: "ABC123",
        };

        return Promise.resolve(token);
      }),
      signRequest: jest.fn((resource) => Promise.resolve(resource)),
    };
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

  public static createTestServerlessYml(asYaml = false, functionMetadata?) {
    const data = {
      "provider": {
        "name": "azure",
        "location": "West US 2"
      },
      "plugins": [
        "serverless-azure-functions"
      ],
      "functions": functionMetadata || MockFactory.createTestFunctionsMetadata(2, false),
    }
    return (asYaml) ? yaml.dump(data) : data;
  }

  public static createTestFunctionsMetadata(functionCount = 2, wrap = false) {
    const data = {};
    for (let i = 0; i < functionCount; i++) {
      const functionName = `function${i + 1}`;
      data[functionName] = MockFactory.createTestFunctionMetadata()
    }
    return (wrap) ? { "functions": data } : data;
  }

  public static createTestFunctionMetadata() {
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

  public static createTestFunctionApp() {
    return {
      id: "App Id",
      name: "App Name",
      defaultHostName: "My Host Name"
    }
  }

  public static createTestAzureServiceProvider() {
    return {
      resourceGroup: "myResourceGroup",
      deploymentName: "myDeploymentName",
    }
  }

  public static createTestVariables() {
    return {
      azureCredentials: "credentials",
      subscriptionId: "subId",
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

  private static createTestCli() {
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
