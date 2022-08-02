import Serverless from "serverless";
import { constants } from "../shared/constants";
import { ServerlessAzureConfig } from "../models/serverless";
import { MockFactory } from "../test/mockFactory";
import { ConfigService } from "./configService";
import { AzureNamingService } from "./namingService";
import { FunctionAppOS, Runtime } from "../config/runtime";

describe("Config Service", () => {
  const serviceName = "my-custom-service"

  let serverless: Serverless;

  function createServerless() {
    const sls = MockFactory.createTestServerless();
    const config = (sls.service as any as ServerlessAzureConfig);
    config.service = serviceName;

    delete config.provider.resourceGroup;
    delete config.provider.region;
    delete config.provider.stage;
    delete config.provider.prefix;
    return sls;
  }

  beforeEach(() => {
    serverless = createServerless();
  });

  describe("Configurable Variables", () => {
    it("returns default values if not specified", () => {
      const service = new ConfigService(serverless, {} as any);
      const { prefix, region, stage } = constants.defaults;
      expect(service.getPrefix()).toEqual(prefix);
      expect(service.getStage()).toEqual(stage);
      expect(service.getRegion()).toEqual(region);
      expect(service.getOs()).toEqual(FunctionAppOS.WINDOWS);
    });

    it("use prefix from the CLI over the SLS yml config", () => {
      const prefix = "prefix";
      const config = (serverless.service as any as ServerlessAzureConfig);
      delete config.provider.resourceGroup;
      config.provider.prefix = "not the prefix";
      expect(serverless.service.provider["prefix"]).not.toEqual(prefix);
      const service = new ConfigService(serverless, { prefix } as any);
      expect(service.getPrefix()).toEqual(prefix);
      expect(service.getResourceGroupName()).toEqual(`${prefix}-wus-dev-${serviceName}-rg`);
    });

    it("use region name from the CLI over the SLS yml config", () => {
      const region = "East US";
      const config = (serverless.service as any as ServerlessAzureConfig);
      delete config.provider.resourceGroup;

      expect(serverless.service.provider.region).not.toEqual(region);
      const service = new ConfigService(serverless, { region } as any);
      expect(service.getRegion()).toEqual(region);
      expect(service.getResourceGroupName()).toEqual(`sls-eus-dev-${serviceName}-rg`);
    });

    it("use stage name from the CLI over the SLS yml config", () => {
      const stage = "test";
      expect(serverless.service.provider.stage).not.toEqual(stage);
      const service = new ConfigService(serverless, { stage } as any);
      expect(service.getStage()).toEqual(stage);
      expect(service.getResourceGroupName()).toEqual(`sls-wus-${stage}-${serviceName}-rg`);
    });

    it("use the resource group name from the CLI over the SLS yml config", () => {
      const resourceGroup = "resourceGroup";
      const config = (serverless.service as any as ServerlessAzureConfig);
      config.provider.resourceGroup = "not the resource group";
      expect(serverless.service.provider["resourceGroup"]).not.toEqual(resourceGroup);
      const service = new ConfigService(serverless, { resourceGroup } as any);
      expect(service.getResourceGroupName()).toEqual(resourceGroup);
    });

    it("use the prefix defined in SLS yml config", () => {
      const expectedPrefix = "testPrefix"
      serverless.service.provider["prefix"] = expectedPrefix;
      const service = new ConfigService(serverless, { } as any);
      expect(service.getPrefix()).toEqual(expectedPrefix);
    });

    it("use region from SLS yml config", () => {
      const expectedRegion = "eastus2"
      serverless.service.provider["region"] = expectedRegion;
      const service = new ConfigService(serverless, { } as any);
      expect(service.getRegion()).toEqual(expectedRegion);
    });

    it("use stage name from SLS yml config", () => {
      const expectedStage = "testStage"
      serverless.service.provider["stage"] = expectedStage;
      const service = new ConfigService(serverless, { } as any);
      expect(service.getStage()).toEqual(expectedStage);
    });

    it("use the resource group name from SLS yml config", () => {
      const service = new ConfigService(serverless, { } as any);
      expect(service.getResourceGroupName()).toEqual(serverless.service.provider["resourceGroup"]);
    });

    it("use location property as region if region not set", () => {
      const slsService = MockFactory.createTestService();
      delete slsService.provider.region;
      const location = "East US";
      slsService.provider["location"] = location;

      const sls = MockFactory.createTestServerless({
        service: slsService
      });

      const service = new ConfigService(sls, {} as any);
      expect(service.getRegion()).toEqual(location);
    });

    it("use os property from SLS yml config", () => {
      serverless.service.provider["os"] = FunctionAppOS.LINUX;
      const service = new ConfigService(serverless, { } as any);
      expect(service.getOs()).toEqual(FunctionAppOS.LINUX);
    });

    it("Generates resource group from convention when NOT defined in sls yaml", () => {
      serverless.service.provider["resourceGroup"] = null;
      const service = new ConfigService(serverless, { } as any);
      const actualResourceGroupName = service.getResourceGroupName();
      const expectedRegion = AzureNamingService.createShortAzureRegionName(service.getRegion());
      const expectedStage = AzureNamingService.createShortStageName(service.getStage());
      const expectedResourceGroupName = `sls-${expectedRegion}-${expectedStage}-${serverless.service["service"]}-rg`;
      expect(actualResourceGroupName).toEqual(expectedResourceGroupName);
    });

    it("Sets external property based on provider config", () => {
      const sls1 = MockFactory.createTestServerless();
      sls1.service.provider["deployment"] = { external: true }
      const service1 = new ConfigService(sls1, {} as any);
      expect(service1.getDeploymentConfig().external).toBe(true);

      const sls2 = MockFactory.createTestServerless();
      sls1.service.provider["deployment"] = { external: false }
      const service2 = new ConfigService(sls2, {} as any);
      expect(service2.getDeploymentConfig().external).toBe(false);
    });

    it("caches the configuration and does not initialize if config is cached", () => {
      const setDefaultValues = jest.spyOn(ConfigService.prototype as any, "setDefaultValues");
      new ConfigService(serverless, {} as any);
      expect(setDefaultValues).toBeCalled();
      setDefaultValues.mockClear();
      new ConfigService(serverless, {} as any);
      expect(setDefaultValues).not.toBeCalled();
    });

    it("indicates that a configuration with default OS should compile before publish", () => {
      const sls = MockFactory.createTestServerless();
      sls.service.provider.runtime = Runtime.DOTNET31;
      sls.service.provider["os"] = undefined;
      const service = new ConfigService(sls, {} as any);
      expect(service.shouldCompileBeforePublish()).toBe(true);
    });

    it("indicates that a configuration with windows OS should compile before publish", () => {
      const sls = MockFactory.createTestServerless();
      sls.service.provider.runtime = Runtime.DOTNET31;
      sls.service.provider["os"] = FunctionAppOS.WINDOWS;
      const service = new ConfigService(sls, {} as any);
      expect(service.shouldCompileBeforePublish()).toBe(true);
    });

    it("indicates that a configuration with linux OS should not compile before publish", () => {
      const sls = MockFactory.createTestServerless();
      sls.service.provider.runtime = Runtime.DOTNET31;
      sls.service.provider["os"] = FunctionAppOS.LINUX;
      const service = new ConfigService(sls, {} as any);
      expect(service.shouldCompileBeforePublish()).toBe(false);
    });

    describe("Service Principal Configuration", () => {
      const cliSubscriptionId = "cli sub id";
      const envVarSubscriptionId = "env var sub id";
      const configSubscriptionId = "config sub id";
      const loginResultSubscriptionId = "ABC123";

      it("use subscription ID from the CLI", () => {
        process.env.AZURE_SUBSCRIPTION_ID = envVarSubscriptionId;
        serverless.service.provider["subscriptionId"] = configSubscriptionId;
        serverless.variables["subscriptionId"] = loginResultSubscriptionId
        const service = new ConfigService(serverless, { subscriptionId: cliSubscriptionId } as any);
        expect(service.getSubscriptionId()).toEqual(cliSubscriptionId);
        expect(serverless.service.provider["subscriptionId"]).toEqual(cliSubscriptionId);
      });

      it("use subscription ID from environment variable", () => {
        process.env.AZURE_SUBSCRIPTION_ID = envVarSubscriptionId;
        serverless.service.provider["subscriptionId"] = configSubscriptionId;
        serverless.variables["subscriptionId"] = loginResultSubscriptionId
        const service = new ConfigService(serverless, { } as any);
        expect(service.getSubscriptionId()).toEqual(envVarSubscriptionId);
        expect(serverless.service.provider["subscriptionId"]).toEqual(envVarSubscriptionId);
      });

      it("use subscription ID from config", () => {
        delete process.env.AZURE_SUBSCRIPTION_ID;
        serverless.service.provider["subscriptionId"] = configSubscriptionId;
        serverless.variables["subscriptionId"] = loginResultSubscriptionId
        const service = new ConfigService(serverless, { } as any);
        expect(service.getSubscriptionId()).toEqual(configSubscriptionId);
        expect(serverless.service.provider["subscriptionId"]).toEqual(configSubscriptionId);
      });

      it("use subscription ID from login result", () => {
        delete process.env.AZURE_SUBSCRIPTION_ID;
        serverless.variables["subscriptionId"] = loginResultSubscriptionId
        const service = new ConfigService(serverless, { } as any);
        expect(service.getSubscriptionId()).toEqual(loginResultSubscriptionId);
        expect(serverless.service.provider["subscriptionId"]).toEqual(loginResultSubscriptionId);
      });
    });

    describe("Runtime version", () => {
      it("throws error when unsupported python version in defined", () => {
        const sls = MockFactory.createTestServerless();
        sls.service.provider.runtime = "python2.7" as any;
        expect(() => new ConfigService(sls, {} as any))
          .toThrowError("Runtime python2.7 is not supported. " +
            "Runtimes supported: nodejs12,nodejs14,nodejs16,python3.6,python3.7,python3.8");
      });

      it("throws error when incomplete nodejs version in defined", () => {
        const sls = MockFactory.createTestServerless();
        sls.service.provider.runtime = "nodejs" as any;
        expect(() => new ConfigService(sls, {} as any))
          .toThrowError("Runtime nodejs is not supported. " +
            "Runtimes supported: nodejs12,nodejs14,nodejs16,python3.6,python3.7,python3.8");
      });

      it("throws error when unsupported nodejs version in defined", () => {
        const sls = MockFactory.createTestServerless();
        sls.service.provider.runtime = "nodejs5.x" as any;
        expect(() => new ConfigService(sls, {} as any))
          .toThrowError("Runtime nodejs5.x is not supported. " +
            "Runtimes supported: nodejs12,nodejs14,nodejs16,python3.6,python3.7,python3.8");
      });

      it("Does not throw an error when valid nodejs version is defined", () => {
        const sls = MockFactory.createTestServerless();
        sls.service.provider.runtime = Runtime.NODE12
        let configService: ConfigService;
        expect(() => configService = new ConfigService(sls, {} as any)).not.toThrow();
        expect(configService.isLinuxTarget()).toBe(false);
        expect(configService.isNodeTarget()).toBe(true);
      });

      it("throws an error when no runtime is defined", () => {
        const sls = MockFactory.createTestServerless();
        sls.service.provider.runtime = undefined;
        expect(() => new ConfigService(sls, {} as any))
          .toThrowError("Runtime undefined. " +
            "Runtimes supported: nodejs12,nodejs14,nodejs16,python3.6,python3.7,python3.8");
      });

      it("does not throw an error with python3.6", () => {
        const sls = MockFactory.createTestServerless();
        sls.service.provider.runtime = Runtime.PYTHON36;
        let configService: ConfigService;
        expect(() => configService = new ConfigService(sls, {} as any)).not.toThrow();
        expect(configService.isLinuxTarget()).toBe(true);
        expect(configService.isPythonTarget()).toBe(true);
      });

      it("does not throw an error with python3.7", () => {
        const sls = MockFactory.createTestServerless();
        sls.service.provider.runtime = Runtime.PYTHON37;
        let configService: ConfigService;
        expect(() => configService = new ConfigService(sls, {} as any)).not.toThrow();
        expect(configService.isLinuxTarget()).toBe(true);
        expect(configService.isPythonTarget()).toBe(true);
      });

      it("does not throw an error with python3.8", () => {
        const sls = MockFactory.createTestServerless();
        sls.service.provider.runtime = Runtime.PYTHON38;
        let configService: ConfigService;
        expect(() => configService = new ConfigService(sls, {} as any)).not.toThrow();
        expect(configService.isLinuxTarget()).toBe(true);
        expect(configService.isPythonTarget()).toBe(true);
      });

      it("forces python runtime to linux OS", () => {
        const sls = MockFactory.createTestServerless();
        sls.service.provider.runtime = Runtime.PYTHON36;
        sls.service.provider["os"] = "windows";
        let configService: ConfigService;
        expect(() => configService = new ConfigService(sls, {} as any)).not.toThrow();
        expect(configService.isLinuxTarget()).toBe(true);
        expect(configService.isPythonTarget()).toBe(true);
      });
    });
  });
});
