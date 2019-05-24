import Serverless from 'serverless';
import Service from 'serverless/classes/Service';
import Utils = require('serverless/classes/Utils');
import PluginManager = require('serverless/classes/PluginManager');
import { AuthResponse, TokenCredentialsBase, LinkedSubscription } from '@azure/ms-rest-nodeauth';
import { TokenCredentials } from '@azure/ms-rest-js';
import { AuthenticationContext } from 'adal-node';

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
      credentials: 'credentials' as any as TokenCredentialsBase,
      subscriptions: [
        {
          id: 'azureSubId',
        }
      ] as any as LinkedSubscription[]
    }
  }

  private static createTestService(): Service {
    return {
      getAllFunctions: jest.fn(),
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
      provider: null
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