import md5 from "md5";
import { StorageAccountResource } from "./storageAccount";
import { ServerlessAzureConfig } from "../../models/serverless";
import { Utils } from "../../shared/utils";

describe("Storage Account Resource", () => {
  const config: ServerlessAzureConfig = {
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

  it("Generates safe storage account name with short parts", () => {
    const testConfig: ServerlessAzureConfig = {
      ...config,
      service: "test-api",
    };

    const result = StorageAccountResource.getResourceName(testConfig);
    assertValidStorageAccountName(testConfig, result);
    expect(result.startsWith("slswusdev")).toBe(true);
  });

  it("Generates safe storage account names with long parts", () => {
    const testConfig: ServerlessAzureConfig = {
      ...config,
      provider: {
        ...config.provider,
        prefix: "my-long-test-prefix-name",
        region: "Australia Southeast",
        stage: "development"
      },
      service: "my-long-test-api",
    };

    const result = StorageAccountResource.getResourceName(testConfig);
    assertValidStorageAccountName(testConfig, result);
    expect(result.startsWith("mylaussedev")).toBe(true);
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
    expect(value).toContain(Utils.createShortAzureRegionName(config.provider.region));
    expect(value).toContain(createSafeString(config.provider.prefix));
    expect(value).toContain(createSafeString(config.provider.stage));
    expect(value).toContain(md5(config.service).substr(0, 3));
  }

  function createSafeString(value: string) {
    return value.replace(/[^\w]+/g, "").toLocaleLowerCase().substr(0, 3);
  };
});