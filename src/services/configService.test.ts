import { ConfigService } from "./configService";
import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { ServerlessAzureConfig } from "../models/serverless";
import configConstants from "../config";
import { AzureNamingService } from "./namingService";

describe("Config Service", () => {
  const serviceName = "my-custom-service"

  let serverless: Serverless;

  beforeEach(() => {
    serverless = MockFactory.createTestServerless();
    const config = (serverless.service as any as ServerlessAzureConfig);
    config.service = serviceName;

    delete config.provider.resourceGroup;
    delete config.provider.region;
    delete config.provider.stage;
    delete config.provider.prefix;
  });

  describe("Configurable Variables", () => {

    it("returns default values if not specified", () => {
      const service = new ConfigService(serverless, {} as any);
      const { prefix, region, stage } = configConstants.defaults;
      expect(service.getPrefix()).toEqual(prefix);
      expect(service.getStage()).toEqual(stage);
      expect(service.getRegion()).toEqual(region);
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
  
    it("Generates resource group from convention when NOT defined in sls yaml", () => {
      serverless.service.provider["resourceGroup"] = null;
      const service = new ConfigService(serverless, { } as any);
      const actualResourceGroupName = service.getResourceGroupName();
      const expectedRegion = AzureNamingService.createShortAzureRegionName(service.getRegion());
      const expectedStage = AzureNamingService.createShortStageName(service.getStage());
      const expectedResourceGroupName = `sls-${expectedRegion}-${expectedStage}-${serverless.service["service"]}-rg`;
      expect(actualResourceGroupName).toEqual(expectedResourceGroupName);
    });
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
});
