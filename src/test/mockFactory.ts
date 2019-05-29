import { AuthResponse, LinkedSubscription, TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import Serverless from "serverless";
import Service from "serverless/classes/Service";
import Utils = require("serverless/classes/Utils");
import PluginManager = require("serverless/classes/PluginManager");

export class MockFactory {
  public static createTestServerless(config?: any): Serverless {
    const sls = new Serverless(config);
    sls.service = config && config.service || MockFactory.createTestService();
    sls.utils = config && config.utils || MockFactory.createTestUtils();
    sls.cli = config && config.cli || MockFactory.createTestCli();
    sls.pluginManager = config && config.pluginManager || MockFactory.createTestPluginManager();
    sls.variables = config && config.variables || MockFactory.createTestVariables();
    return sls;
  }

  public static createTestServerlessOptions(): Serverless.Options {
    return {
      extraServicePath: null,
      function: null,
      noDeploy: null,
      region: null,
      stage: null,
      watch: null
    }
  }

  public static createTestAuthResponse(): AuthResponse {
    return {
      credentials: "credentials" as any as TokenCredentialsBase,
      subscriptions: [
        {
          id: "azureSubId",
        }
      ] as any as LinkedSubscription[]
    }
  }

  public static createTestFunctionApp() {
    return {
      id: "App Id",
      name: "App Name",
      defaultHostName: "My Host Name"
    }
  }

  public static createTestService(): Service {
    return {
      getAllFunctions: jest.fn(() => ["function1"]),
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
      readFileSync: jest.fn(),
      walkDirSync: jest.fn(),
      writeFile: jest.fn(),
      writeFileDir: jest.fn(),
      writeFileSync: jest.fn()
    }
  }

  private static createTestCli(){
    return {
      log: jest.fn()
    }
  }

  private static createTestPluginManager(): PluginManager {
    return  {
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
      spawn: jest.fn()
    }
  }
}