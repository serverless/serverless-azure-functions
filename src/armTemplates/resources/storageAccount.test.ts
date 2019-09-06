import { ServerlessAzureConfig } from "../../models/serverless";
import { AzureNamingService } from "../../services/namingService";
import { StorageAccountResource } from "./storageAccount";
import md5 from "md5";

describe("Storage Account Resource", () => {
  const resourceGroup = "myResourceGroup";
  const resourceGroupHash = md5(resourceGroup).substr(0, 6);

  const config: ServerlessAzureConfig = {
    functions: [],
    plugins: [],
    package: null,
    provider: {
      runtime: "nodejs10.x",
      prefix: "sls",
      name: "azure",
      region: "westus",
      stage: "dev",
      resourceGroup
    },
    service: "test-api"
  }

  it("Generates safe storage account name with short parts", () => {
    const testConfig: ServerlessAzureConfig = {
      ...config,
      provider: {
        ...config.provider,
        resourceGroup
      },
      service: "test-api",
    };

    const result = StorageAccountResource.getResourceName(testConfig);
    assertValidStorageAccountName(testConfig, result);
    expect(result).toEqual(`slswusdev${resourceGroupHash}`);
  });

  it("Generates safe storage account names with long parts", () => {
    const testConfig: ServerlessAzureConfig = {
      ...config,
      provider: {
        ...config.provider,
        prefix: "my-long-test-prefix-name",
        region: "Australia Southeast",
        stage: "development",
        resourceGroup
      }
    };

    const result = StorageAccountResource.getResourceName(testConfig);
    assertValidStorageAccountName(testConfig, result);
    expect(result).toEqual(`mylaussedev${resourceGroupHash}`)
  });

  it("Generating a storage account name is idempotent", () => {
    const result1 = StorageAccountResource.getResourceName(config);
    const result2 = StorageAccountResource.getResourceName(config);

    expect(result1).toEqual(result2);
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
        ...config,
        provider: {
          ...config.provider,
          region: region,
        }
      };
    });

    const results = {};
    regionConfigs.forEach((config) => {
      const result = StorageAccountResource.getResourceName(config);
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
        ...config,
        provider: {
          ...config.provider,
          region: region,
        }
      };
    });

    const results = {};
    stageConfigs.forEach((config) => {
      const result = StorageAccountResource.getResourceName(config);
      assertValidStorageAccountName(config, result);
      results[result] = config;
    });

    expect(Object.keys(results)).toHaveLength(stageConfigs.length);
  });

  function assertValidStorageAccountName(config: ServerlessAzureConfig, value: string) {
    expect(value.length).toBeLessThanOrEqual(24);
    expect(value.match(/[a-z0-9]/g).length).toEqual(value.length);
    expect(value).toContain(AzureNamingService.createShortAzureRegionName(config.provider.region));
    expect(value).toContain(createSafeString(config.provider.prefix));
    expect(value).toContain(createSafeString(config.provider.stage));
  }

  function createSafeString(value: string) {
    return value.replace(/\W+/g, "").toLowerCase().substr(0, 3);
  };
});
