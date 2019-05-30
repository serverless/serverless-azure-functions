import { AuthResponse, LinkedSubscription, TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import yaml from "js-yaml";
import Serverless from "serverless";
import Service from "serverless/classes/Service";
import Utils = require("serverless/classes/Utils");
import PluginManager = require("serverless/classes/PluginManager");


export class MockFactory {
  public static createTestServerless(config?: any): Serverless {
    const sls = new Serverless(config);
    sls.service = MockFactory.createTestService();
    sls.utils = MockFactory.createTestUtils();
    sls.cli = MockFactory.createTestCli();
    sls.pluginManager = MockFactory.createTestPluginManager();
    sls.variables = {};
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
      const functionName = `function${i+1}`;
      data[functionName] = MockFactory.createTestFunctionMetadata(functionName)
    }
    return (wrap) ? {"functions": data } : data;
  }

  public static createTestFunctionMetadata(name: string) {
    return {
      "handler": `${name}/index.handler`,
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

  private static createTestService(): Service {
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
      provider: {} as any,
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
          return MockFactory.createTestServerlessYml(true);
        }
      }),
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