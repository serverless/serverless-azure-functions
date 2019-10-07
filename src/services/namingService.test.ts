import { AzureNamingService, AzureNamingServiceOptions } from "./namingService"
import { ServerlessAzureConfig, Runtime } from "../models/serverless";
import md5 from "md5";

describe("Naming Service", () => {

  const resourceGroup = "myResourceGroup";
  const resourceGroupHash = md5(resourceGroup).substr(0, 6);
  const defaultConfig: ServerlessAzureConfig = {
    functions: [],
    plugins: [],
    provider: {
      prefix: "sls",
      name: "azure",
      region: "westus",
      stage: "dev",
      resourceGroup,
      runtime: Runtime.NODE10,
    },
    service: "test-api",
    package: {
      artifact: "",
      artifactDirectoryName: "",
      individually: false,
    } as any,
  };

  it("Gets resource name with hash by default", () => {
    const result = AzureNamingService.getResourceName({config: defaultConfig});

    expect(result).toEqual(`${defaultConfig.provider.prefix}-wus-${defaultConfig.provider.stage}-${resourceGroupHash}`);
  });

  it("Gets resource name without hash when specified", () => {
    const options: AzureNamingServiceOptions = {config: defaultConfig, includeHash: false};
    const result = AzureNamingService.getResourceName(options);

    expect(result).toEqual(`${defaultConfig.provider.prefix}-wus-${defaultConfig.provider.stage}`);
  });

  it("Gets resource name with suffix", () => {
    const options: AzureNamingServiceOptions = {config: defaultConfig, suffix: "suf"};
    const result = AzureNamingService.getResourceName(options);

    expect(result).toEqual(`${defaultConfig.provider.prefix}-wus-${defaultConfig.provider.stage}-${resourceGroupHash}-suf`);
  });

  it("Uses resource name from config if specified", () => {
    const options: AzureNamingServiceOptions = {config: defaultConfig, resourceConfig: {name: "test-resource"} as any};
    const result = AzureNamingService.getResourceName(options);

    expect(result).toEqual("test-resource");
  });

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
    const timestamp = Date.now();
    const deploymentName = AzureNamingService.getDeploymentName(defaultConfig, `t${timestamp}`);

    expect(deploymentName).toEqual(`slswusdevtestapi-DEPLOYMENT-t${timestamp}`);
    assertValidDeploymentName(defaultConfig, deploymentName, timestamp);
  });

  it("deployment name with long suffix or service name generated correctly", () => {
    const config: ServerlessAzureConfig = {
      ...defaultConfig,
      provider: {
        ...defaultConfig.provider,
        prefix: "sls-long-prefix-name"
      },
      service: "extra-long-service-name"
    };

    const timestamp = Date.now();
    const deploymentName = AzureNamingService.getDeploymentName(config, `t${timestamp}`);

    expect(deploymentName).toEqual(`slswusdevext-DEPLOYMENT-t${timestamp}`);
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
