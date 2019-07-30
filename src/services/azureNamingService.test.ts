import { ServerlessAzureOptions, ServerlessAzureConfig } from "../models/serverless"
import { AzureNamingService } from "./azureNamingService"
import { MockFactory } from "../test/mockFactory"
import { ArmResourceType } from "../models/armTemplates";
import md5 from "md5";
import { Utils } from "../shared/utils"

describe("Azure Naming Service", () => {

  let service: AzureNamingService;

  const azureConfig: ServerlessAzureConfig = {
    functions: [],
    plugins: [],
    provider: {
      prefix: "sls",
      name: "azure",
      region: "westus",
      stage: "dev",
    },
    service: "test-api"
  }

  function getConfig(config?): ServerlessAzureConfig {
    return {
      ...azureConfig,
      ...config
    }
  }

  function getService(config?: ServerlessAzureConfig, options?: ServerlessAzureOptions) {
    const sls = MockFactory.createTestServerless();
    options = options || MockFactory.createTestServerlessOptions();
    sls.service = getConfig(config) as any;
    return new AzureNamingService(sls, options);
  }

  beforeEach(() => {
    service = getService();
  });

  it("Sets default region and stage values if not defined", () => {
    expect(service.getRegion()).toEqual("westus");
    expect(service.getStage()).toEqual("dev");
  });

  it("returns region and stage based on CLI options", () => {
    const cliOptions = {
      stage: "prod",
      region: "eastus2",
    };
    service = getService(azureConfig, cliOptions);

    expect(service.getRegion()).toEqual(cliOptions.region);
    expect(service.getStage()).toEqual(cliOptions.stage);
  });

  it("uses the resource group name specified in CLI", () => {
    const resourceGroupName = "cliResourceGroupName"
    const cliOptions = {
      stage: "prod",
      region: "eastus2",
      resourceGroup: resourceGroupName
    };

    const service = getService(null, cliOptions);
    const actualResourceGroupName = service.getResourceGroupName();
    expect(actualResourceGroupName).toEqual(resourceGroupName);
  });

  it("uses the resource group name from the sls yaml config", () => {
    const resourceGroupName = "myResourceGroup";
    service = getService({
      ...azureConfig,
      provider: {
        ...azureConfig.provider,
        resourceGroup: resourceGroupName,
      }
    })
    const actualResourceGroupName = service.getResourceGroupName();

    expect(actualResourceGroupName).toEqual(resourceGroupName);
  });

  it("Generates resource group from convention when NOT defined in sls yaml", () => {
    const serviceName = "myService";
    service = getService({
      ...azureConfig,
      provider: {
        ...azureConfig.provider,
        resourceGroup: null
      },
      service: serviceName
    });

    const actualResourceGroupName = service.getResourceGroupName();
    const expectedRegion = Utils.createShortAzureRegionName(service.getRegion());
    const expectedStage = Utils.createShortStageName(service.getStage());
    const expectedResourceGroupName = `sls-${expectedRegion}-${expectedStage}-${serviceName}-rg`;

    expect(actualResourceGroupName).toEqual(expectedResourceGroupName);
  });

  it("set default prefix when one is not defined in yaml config", () => {
    service = getService({
      ...azureConfig,
      provider: {
        name: "azure",
        region: "westus",
        stage: "dev",
      }
    });
    expect(service.getPrefix()).toEqual("sls");
  });

  it("use the prefix defined in sls yaml config", () => {
    service = getService({
      ...azureConfig,
      provider: {
        name: "azure",
        region: "westus",
        stage: "dev",
        prefix: "hello"
      }
    });
    expect(service.getPrefix()).toEqual("hello");
  });

  it("generates safe deployment names", () => {
    const serviceName = "thisismysuperlongservicenamethatnevereverevereverends";
    const prefix = "thisismysuperlongprefixthatnevereverevereverends";
    service = getService({
      ...azureConfig,
      provider: {
        name: "azure",
        region: "West US 2",
        stage: "prod",
        prefix,
      },
      service: serviceName
    });

    const nameHash = md5(serviceName)
    const pattern = `${prefix.substr(0, 8)}-wus2-pro-${nameHash.substr(0, 6)}-deployment-t([0-9]+)`;

    expect(service.getDeploymentName()).toMatch(new RegExp(pattern, "g"))
  });

  describe("Resource names", () => {

    function assertValidStorageAccountName(config: ServerlessAzureConfig, value: string) {
      expect(value.length).toBeLessThanOrEqual(24);
      expect(value.match(/[a-z0-9]/g).length).toEqual(value.length);
      expect(value).toContain(Utils.createShortAzureRegionName(config.provider.region));
      expect(value).toContain(createSafeString(config.provider.prefix));
      expect(value).toContain(createSafeString(config.provider.stage));
      expect(value).toContain(md5(config.service).substr(0, 3));
    }

    function createSafeString(value: string) {
      return value.replace(/\W+/g, "").toLocaleLowerCase().substr(0, 3);
    };

    it("Generates safe storage account name with short parts", () => {
      const result = service.getResourceName(ArmResourceType.StorageAccount);
      assertValidStorageAccountName(azureConfig, result);
      expect(result.startsWith("slswusdev")).toBe(true);
    });

    it("Generates safe storage account names with long parts", () => {
      const testConfig: ServerlessAzureConfig = getConfig({
        provider: {
          ...azureConfig.provider,
          prefix: "my-long-test-prefix-name",
          region: "Australia Southeast",
          stage: "development"
        },
        service: "my-long-test-api",
      });

      service = getService(testConfig);

      const result = service.getResourceName(ArmResourceType.StorageAccount)
      assertValidStorageAccountName(testConfig, result);
      expect(result.startsWith("myloaussedev")).toBe(true);
    });

    it("Generating a storage account name is idempotent", () => {
      const service1 = getService({
        service: "myService"
      } as any)
      const result1 = service1.getResourceName(ArmResourceType.StorageAccount);

      const service2 = getService({
        service: "myService"
      } as any);
      const result2 = service2.getResourceName(ArmResourceType.StorageAccount);

      expect(result1).toEqual(result2);

      const service3 = getService({
        service: "myOtherService"
      } as any);
      const result3 = service3.getResourceName(ArmResourceType.StorageAccount);

      expect(result3).not.toEqual(result1);
    });

    it("Generates distinct account names based on region", () => {
      const regions = [
        "eastasia",
        "southeastasia",
        "centralus",
        "eastus",
        "eastus2",
        "westus",
        "northcentralus",
        "southcentralus",
        "northeurope",
        "westeurope",
        "japanwest",
        "japaneast",
        "brazilsouth",
        "australiaeast",
        "australiasoutheast",
        "southindia",
        "centralindia",
        "westindia",
        "canadacentral",
        "canadaeast",
        "uksouth",
        "ukwest",
        "westcentralus",
        "westus2",
        "koreacentral",
        "koreasouth",
        "francecentral",
        "francesouth",
        "australiacentral",
        "australiacentral2",
        "uaecentral",
        "uaenorth",
        "southafricanorth",
        "southafricawest"
      ];

      const regionConfigs = regions.map((region) => {
        return {
          ...azureConfig,
          provider: {
            ...azureConfig.provider,
            region: region,
          }
        };
      });

      const results = {};
      regionConfigs.forEach((config) => {
        service = getService(config);
        const result = service.getResourceName(ArmResourceType.StorageAccount)
        assertValidStorageAccountName(config, result);
        results[result] = config;
      });

      expect(Object.keys(results)).toHaveLength(regionConfigs.length);
    });

    it("Generates distinct account names based on stage", () => {
      const stages = [
        "dev",
        "test",
        "qa",
        "uat",
        "prod",
        "preprod",
      ];

      const stageConfigs = stages.map((region) => {
        return {
          ...azureConfig,
          provider: {
            ...azureConfig.provider,
            region: region,
          }
        };
      });

      const results = {};
      stageConfigs.forEach((config) => {
        service = getService(config);
        const result = service.getResourceName(ArmResourceType.StorageAccount)
        assertValidStorageAccountName(config, result);
        results[result] = config;
      });

      expect(Object.keys(results)).toHaveLength(stageConfigs.length);
    });
  });
});
