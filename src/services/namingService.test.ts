import { AzureNamingService } from "./namingService"
import { ServerlessAzureConfig } from "../models/serverless";

describe("Naming Service", () => {
  it("Creates a short name for an azure region", () => {
    const expected = "ausse";
    const actual = AzureNamingService.createShortAzureRegionName("australiasoutheast");

    expect(actual).toEqual(expected);
  });

  it("Creates a short stage name from a well known name", () => {
    const expected = "prod";
    const actual = AzureNamingService.createShortStageName("production");

    expect(actual).toEqual(expected);
  });

  it("Creates a short stage name from a unknown name", () => {
    const value = "user acceptance";
    const actual = AzureNamingService.createShortStageName(value);

    expect(actual).toEqual(value.substr(0, 3));
  });

  it("Creates a short stage name from multiple values", () => {
    const actual = AzureNamingService.createShortStageName("production dogfood");
    expect(actual).toEqual("proddf");
  });


  it("Creates unique short names for all azure regions", () => {
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

    const results = {};
    regions.forEach((region) => {
      const result = AzureNamingService.createShortAzureRegionName(region);
      results[result] = region;
    });

    expect(Object.keys(results)).toHaveLength(regions.length);
  });

  it("gets a normalized region name from full region name", () => {
    const result = AzureNamingService.getNormalizedRegionName("West US 2");
    expect(result).toEqual("westus2");
  });

  it("Performs noop if region name is already normalized", () => {
    const expected = "westus2";
    const actual = AzureNamingService.getNormalizedRegionName(expected);
    expect(actual).toEqual(expected);
  });

  it("deployment name is generated correctly", () => {
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
    };

    const timestamp = Date.now();
    const deploymentName = AzureNamingService.getDeploymentName(config, `t${timestamp}`);

    expect(deploymentName).toEqual(`slswusdevtestapi-DEPLOYMENT-t${timestamp}`);
    assertValidDeploymentName(config, deploymentName, timestamp);
  });

  it("deployment name with long suffix or service name generated correctly", () => {
    const config: ServerlessAzureConfig = {
      functions: [],
      plugins: [],
      provider: {
        prefix: "sls-long-prefix-name",
        name: "azure",
        region: "westus",
        stage: "multicloud",
      },
      service: "extra-long-service-name"
    };

    const timestamp = Date.now();
    const deploymentName = AzureNamingService.getDeploymentName(config, `t${timestamp}`);

    expect(deploymentName).toEqual(`slswusmulext-DEPLOYMENT-t${timestamp}`);
    assertValidDeploymentName(config, deploymentName, timestamp);
  });

  function assertValidDeploymentName(config: ServerlessAzureConfig, value: string, timestamp: number) {
    expect(value.length).toBeLessThanOrEqual(64);
    expect(value).toContain(timestamp);
    expect(value).toContain(AzureNamingService.createShortAzureRegionName(config.provider.region));
    expect(value).toContain(createSafeString(config.provider.prefix));
    expect(value).toContain(createSafeString(config.provider.stage));
    expect(value).toContain(createSafeString(config.service));
  }

  function createSafeString(value: string) {
    return value.replace(/\W+/g, "").toLowerCase().substr(0, 3);
  };
});
