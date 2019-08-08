import { ApiContract, ApiManagementServiceResource } from "@azure/arm-apimanagement/esm/models";
import { FunctionEnvelope, Site } from "@azure/arm-appservice/esm/models";
import { DeploymentExtended, DeploymentsListByResourceGroupResponse } from "@azure/arm-resources/esm/models";
import { HttpHeaders, HttpOperationResponse, HttpResponse, WebResource } from "@azure/ms-rest-js";
import { AuthResponse, LinkedSubscription, TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { TokenClientCredentials, TokenResponse } from "@azure/ms-rest-nodeauth/dist/lib/credentials/tokenClientCredentials";
import { ServiceListContainersSegmentResponse } from "@azure/storage-blob/typings/lib/generated/lib/models";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import yaml from "js-yaml";
import Serverless from "serverless";
import Service from "serverless/classes/Service";
import Utils from "serverless/classes/Utils";
import PluginManager from "serverless/lib/classes/PluginManager";
import { ApiCorsPolicy, ApiManagementConfig } from "../models/apiManagement";
import { ArmDeployment, ArmResourceTemplate } from "../models/armTemplates";
import { ServicePrincipalEnvVariables } from "../models/azureProvider";
import { Logger } from "../models/generic";
import { ServerlessAzureConfig, ServerlessAzureProvider, ServerlessAzureFunctionConfig } from "../models/serverless";

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
    sls.config.servicePath = "";
    return sls;
  }

  public static createTestService(functions?): Service {
    if (!functions) {
      functions = MockFactory.createTestSlsFunctionConfig()
    }
    const serviceName = "serviceName";
    return {
      getAllFunctions: jest.fn(() => Object.keys(functions)),
      getFunction: jest.fn((name: string) => functions[name]),
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

  public static updateService(sls: Serverless) {
    sls.service = MockFactory.createTestService(sls.service["functions"]);
  }

  public static createTestServerlessOptions(options?: any): Serverless.Options {
    return {
      extraServicePath: null,
      function: null,
      noDeploy: null,
      region: null,
      stage: null,
      watch: null,
      ...options
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

  public static createTestFunctions(functionCount = 3) {
    const functions = []
    for (let i = 0; i < functionCount; i++) {
      functions.push(MockFactory.createTestFunction(`function${i + 1}`));
    }
    return functions;
  }

  public static createTestFunction(name: string = "TestFunction") {
    return {
      properties: {
        name,
        config: {
          bindings: MockFactory.createTestBindings()
        }
      }
    }
  }

  public static createTestAzureCredentials(): TokenClientCredentials {
    const credentials = {
      getToken: jest.fn(() => {
        const token: TokenResponse = this.createTestTokenCacheEntries()[0];

        return Promise.resolve(token);
      }),
      signRequest: jest.fn((resource) => Promise.resolve(resource)),
    };

    return credentials;
  }

  public static createTestTokenCacheEntries(count: number = 1): TokenResponse[] {
    const token: TokenResponse = {
      tokenType: "Bearer",
      accessToken: "ABC123",
      userId: "example@user.com",
    };
    const result = Array(count).fill(token);

    return result;
  }

  public static createTestSubscriptions(count: number = 1): any[] {
    const sub = {
      id: "abc-1234-5678",
      state: "Enabled",
      authorizationSource: "RoleBased",
      user: { name: "example@user.com", type: "user" },
      environmentName: "AzureCloud",
      name: "Test Sub"
    };
    const result = Array(count).fill(sub);

    return result;
  }

  public static createTestTimestamp(): string {
    return "1562184492";
  }

  public static createTestDeployments(count: number = 5, includeTimestamp = false): DeploymentsListByResourceGroupResponse {
    const result = [];
    const originalTimestamp = +MockFactory.createTestTimestamp();
    for (let i = 0; i < count; i++) {
      result.push(
        MockFactory.createTestDeployment((includeTimestamp) ? `deployment${i + 1}-t${originalTimestamp + i}` : `deployment${i + 1}`)
      )
    }
    return result as DeploymentsListByResourceGroupResponse
  }

  public static createTestParameters() {
    return {
      param1: { value: "1", type: "String" },
      param2: { value: "2", type: "String" },
    }
  }

  public static createTestDeployment(name?: string): DeploymentExtended {
    return {
      name: name || `deployment1-t${MockFactory.createTestTimestamp()}`,
      properties: {
        timestamp: new Date(),
        parameters: MockFactory.createTestParameters(),
      }
    }
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

  public static createTestAzureContainers(count: number = 5): ServiceListContainersSegmentResponse {
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push({
        name: `container${i}`,
        blobs: MockFactory.createTestAzureBlobItems(i),
      });
    }
    return { containerItems: result } as ServiceListContainersSegmentResponse;
  }

  public static createTestBlockBlobUrl(containerName: string, blobName: string, contents: string = "test") {
    return {
      containerName,
      blobName,
      url: `http://storage.azure.com/${containerName}/${blobName}`,
      delete: jest.fn(),
      getProperties: jest.fn(() => Promise.resolve({
        contentLength: contents.length
      }))
    }
  }

  public static createTestAzureBlobItems(id: number = 1, count: number = 5) {
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(MockFactory.createTestAzureBlobItem(id, i));
    }
    return { segment: { blobItems: result } };
  }

  public static createTestAzureBlobItem(id: number = 1, index: number = 1, ext: string = ".zip") {
    return {
      name: `blob-${id}-${index}${ext}`
    }
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
      provider: {
        name: "azure",
        region: "West US 2"
      },
      plugins: [
        "serverless-azure-functions"
      ],
      functions: functionMetadata || MockFactory.createTestSlsFunctionConfig(),
    }
    return (asYaml) ? yaml.dump(data) : data;
  }

  public static createTestApimConfig(generateName: boolean = false): ApiManagementConfig {
    return {
      name: generateName ? null : "test-apim-resource",
      api: {
        name: "test-apim-api1",
        subscriptionRequired: false,
        displayName: "API 1",
        description: "description of api 1",
        protocols: ["https"],
        path: "test-api1",
      },
    };
  }

  public static createTestFunctionApimConfig(name: string) {
    return {
      apim: {
        operations: [
          {
            method: "get",
            urlTemplate: name,
            displayName: name,
          },
        ],
      },
    };
  }

  public static createTestFunctionMetadata(name: string) {
    return {
      "handler": `${name}.handler`,
      "events": MockFactory.createTestFunctionEvents(),
    }
  }

  public static createTestFunctionEvents() {
    return [
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

  public static createTestFunctionsResponse(functions?) {
    const result = []
    functions = functions || MockFactory.createTestSlsFunctionConfig();
    for (const name of Object.keys(functions)) {
      result.push({ properties: MockFactory.createTestFunctionEnvelope(name) });
    }
    return result;
  }

  public static createTestAzureServiceProvider(): ServerlessAzureProvider {
    return {
      name: "azure",
      prefix: "sls",
      resourceGroup: "myResourceGroup",
      deploymentName: "myDeploymentName",
      region: "eastus2",
      stage: "dev",
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
      azureCredentials: this.createTestAzureCredentials(),
      subscriptionId: "azureSubId",
    }
  }

  public static createTestSite(name: string = "Test"): Site {
    return {
      id: "appId",
      name: name,
      location: "West US",
      defaultHostName: "myHostName.azurewebsites.net",
      enabledHostNames: [
        "myHostName.azurewebsites.net",
        "myHostName.scm.azurewebsites.net",
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

  public static createTestAzureFunctionConfig(route?: string): ServerlessAzureFunctionConfig {
    return {
      events: [
        {
          http: true,
          "x-azure-settings": MockFactory.createTestHttpBinding("in", route),
        },
        {
          http: true,
          "x-azure-settings": MockFactory.createTestHttpBinding("out"),
        }
      ],
      handler: "handler.js",
    }
  }

  public static createTestEventHubFunctionConfig(): ServerlessAzureFunctionConfig {
    return {
      events: [
        {
          http: true,
          "x-azure-settings": MockFactory.createTestEventHubBinding("in"),
        }
      ],
      handler: "handler.js",
    }
  }
  
  public static createTestBinding() {
    // Only supporting HTTP for now, could support others
    return MockFactory.createTestHttpBinding();
  }

  public static createTestHttpBinding(direction: string = "in", route?: string) {
    if (direction === "in") {
      return {
        authLevel: "anonymous",
        type: "httpTrigger",
        direction,
        name: "req",
        route,
      }
    } else {
      return {
        type: "http",
        direction,
        name: "res"
      }
    }
  }

  public static createTestEventHubBinding(direction: string = "in") {
    return {
      event: "eventHubTrigger",
      direction,
      name: "item",
      eventhubname: "hello",
      consumerGroup: "$Default",
      connection: "EventHubsConnection"        
    }
  }
  public static createTestBindingsObject(name: string = "index.js") {
    return {
      scriptFile: name,
      entryPoint: "handler",
      disabled: false,
      bindings: [
        MockFactory.createTestHttpBinding("in"),
        MockFactory.createTestHttpBinding("out")
      ]
    }
  }

  public static createTestSlsFunctionConfig() {
    return {
      hello: {
        ...MockFactory.createTestFunctionMetadata("hello"),
        ...MockFactory.createTestFunctionApimConfig("hello"),
      },
      goodbye: {
        ...MockFactory.createTestFunctionMetadata("goodbye"),
        ...MockFactory.createTestFunctionApimConfig("goodbye"),
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
      dirExistsSync: jest.fn(() => false),
      fileExistsSync: jest.fn(() => false),
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

  /**
   * Create a mock "request" module factory used to mock request objects that support piping
   * @param response The expected HTTP response
   */
  public static createTestMockRequestFactory(response: any = {}) {
    return jest.fn((options, callback) => {
      setImmediate(() => callback(null, response));

      // Required interface for .pipe()
      return {
        on: jest.fn(),
        once: jest.fn(),
        emit: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };
    });
  }

  public static createTestMockApiCorsPolicy(): ApiCorsPolicy {
    return {
      allowCredentials: false,
      allowedOrigins: ["*"],
      allowedHeaders: ["*"],
      exposeHeaders: ["*"],
      allowedMethods: ["GET", "POST"],
    };
  }

  public static createTestArmDeployment(): ArmDeployment {
    return {
      template: MockFactory.createTestArmTemplate(),
      parameters: MockFactory.createTestParameters(),
    }
  }

  public static createTestArmTemplate(): ArmResourceTemplate {
    return {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "param1": {
          "defaultValue": "",
          "type": "String"
        },
        "param2": {
          "defaultValue": "",
          "type": "String"
        },
      },
      "variables": {},
      "resources": []
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
