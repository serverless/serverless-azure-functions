import Serverless from 'serverless';
import Service from 'serverless/classes/Service';
import Utils = require('serverless/classes/Utils');
import PluginManager = require('serverless/classes/PluginManager');

export class MockFactory {
  public static createTestServerless(service?: Service, utils?: Utils, pluginManager?: PluginManager): Serverless {
    const sls = new Serverless();
    sls.service = service || MockFactory.createTestService();
    sls.utils = utils || MockFactory.createTestUtils();
    sls.cli = MockFactory.createTestCli();
    sls.pluginManager = pluginManager || MockFactory.createTestPluginManager();
    return sls;
  }

  public static createTestService(): Service {
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

  public static createTestUtils(): Utils {
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

  public static createTestCli(){
    return {
      log: jest.fn()
    }
  }

  public static createTestPluginManager(): PluginManager {
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