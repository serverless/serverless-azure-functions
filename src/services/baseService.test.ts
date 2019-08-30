import fs from "fs";
import mockFs from "mock-fs";
import Serverless from "serverless";
import { ServerlessAzureOptions, ServerlessAzureConfig } from "../models/serverless";
import { MockFactory } from "../test/mockFactory";
import { BaseService } from "./baseService";
import { AzureNamingService } from "./namingService";

jest.mock("axios", () => jest.fn());
import axios from "axios";

jest.mock("request", () => MockFactory.createTestMockRequestFactory());
import request from "request";

class MockService extends BaseService {
  public constructor(serverless: Serverless, options?: ServerlessAzureOptions) {
    super(serverless, options);
  }

  public axiosRequest(method, url, options) {
    return this.sendApiRequest(method, url, options);
  }

  public postFile(requestOptions, filePath) {
    return this.sendFile(requestOptions, filePath);
  }

  public getProperties() {
    return {
      baseUrl: this.baseUrl,
      serviceName: this.serviceName,
      credentials: this.credentials,
      subscriptionId: this.subscriptionId,
      resourceGroup: this.resourceGroup,
      deploymentName: this.deploymentName,
    };
  }
}

describe("Base Service", () => {
  let service: MockService;
  let serverless: Serverless;
  const serviceName = "my-custom-service"
  const loginResultSubscriptionId = "ABC123";
  const envVarSubscriptionId = "env var sub id";


  const slsConfig = {
    service: serviceName,
    provider: {
      resourceGroup: "My-Resource-Group",
      deploymentName: "My-Deployment",
    },
  };

  afterAll(() => {
    mockFs.restore();
  });

  function createMockService(sls: Serverless, options?: Serverless.Options) {
    sls.variables["azureCredentials"] = MockFactory.createTestAzureCredentials();
    sls.variables["subscriptionId"] = loginResultSubscriptionId;
    Object.assign(sls.service, slsConfig);

    return new MockService(sls, options);
  }

  beforeEach(() => {
    serverless = MockFactory.createTestServerless();
    service = createMockService(serverless);
  });

  it("Initializes common service properties", () => {
    const props = service.getProperties();
    expect(props.baseUrl).toEqual("https://management.azure.com");
    expect(props.credentials).toEqual(serverless.variables["azureCredentials"]);
    expect(props.subscriptionId).toEqual(serverless.variables["subscriptionId"]);
    expect(props.serviceName).toEqual(slsConfig.service);
    expect(props.resourceGroup).toEqual(slsConfig.provider.resourceGroup);
    const expectedDeploymentNameRegex = new RegExp(slsConfig.provider.deploymentName + "-t([0-9]+)")
    expect(props.deploymentName).toMatch(expectedDeploymentNameRegex);
  });

  it("Sets default region and stage values if not defined", () => {
    const mockService = new MockService(serverless);

    expect(mockService).not.toBeNull();
    expect(serverless.service.provider.region).toEqual("westus");
    expect(serverless.service.provider.stage).toEqual("dev");
  });

  it("returns region and stage based on CLI options", () => {
    const cliOptions = {
      stage: "prod",
      region: "eastus2",
    };
    const mockService = new MockService(serverless, cliOptions);

    expect(mockService.getRegion()).toEqual(cliOptions.region);
    expect(mockService.getStage()).toEqual(cliOptions.stage);
  });

  it("use the resource group name specified in CLI", () => {
    const resourceGroupName = "cliResourceGroupName"
    const cliOptions = {
      stage: "prod",
      region: "eastus2",
      resourceGroup: resourceGroupName
    };

    const mockService = new MockService(serverless, cliOptions);
    const actualResourceGroupName = mockService.getResourceGroupName();

    expect(actualResourceGroupName).toEqual(resourceGroupName);
  });

  it("use the resource group name from sls yaml config", () => {
    const mockService = new MockService(serverless);
    const actualResourceGroupName = mockService.getResourceGroupName();

    expect(actualResourceGroupName).toEqual(serverless.service.provider["resourceGroup"]);
  });

  it("Generates resource group from convention when NOT defined in sls yaml", () => {
    serverless.service.provider["resourceGroup"] = null;
    const mockService = new MockService(serverless);
    const actualResourceGroupName = mockService.getResourceGroupName();
    const expectedRegion = AzureNamingService.createShortAzureRegionName(mockService.getRegion());
    const expectedStage = AzureNamingService.createShortStageName(mockService.getStage());
    const expectedResourceGroupName = `sls-${expectedRegion}-${expectedStage}-${serverless.service["service"]}-rg`;

    expect(actualResourceGroupName).toEqual(expectedResourceGroupName);
  });

  it("set default prefix when one is not defined in yaml config", () => {
    const mockService = new MockService(serverless);
    const actualPrefix = mockService.getPrefix();
    expect(actualPrefix).toEqual("sls");
  });

  it("use the prefix defined in sls yaml config", () => {
    const expectedPrefix = "testPrefix"
    serverless.service.provider["prefix"] = expectedPrefix;
    const mockService = new MockService(serverless);
    const actualPrefix = mockService.getPrefix();

    expect(actualPrefix).toEqual(expectedPrefix);
  });

  it("Fails if credentials have not been set in serverless config", () => {
    serverless.variables["azureCredentials"] = null;
    expect(() => new MockService(serverless)).toThrow()
  });

  it("Makes HTTP request via axios", async () => {
    const method = "GET";
    const url = "https://api.service.com/foo/bar";
    const axiosMock = (axios as any) as jest.Mock;
    const options = {
      headers: {
        "x-custom": "value",
      }
    };
    await service.axiosRequest(method, url, options);

    const expectedHeaders = {
      ...options.headers,
      Authorization: expect.any(String),
    }

    expect(axiosMock).toBeCalledWith(url, {
      method,
      headers: expectedHeaders,
    });
  });

  it("POST a file to a HTTP endpoint", async () => {
    mockFs({
      ".serverless": {
        "project.zip": "contents",
      },
    });

    const readStreamSpy = jest.spyOn(fs, "createReadStream");

    const filePath = ".serverless/project.zip";
    const requestOptions = {
      method: "POST",
      uri: "https://myCustomSite.scm.azurewebsites.net/api/zipdeploy/",
      json: true,
      headers: {
        Authorization: "Bearer ABC123",
        Accept: "*/*",
        ContentType: "application/octet-stream",
      }
    };

    await service.postFile(requestOptions, filePath);

    expect(readStreamSpy).toBeCalledWith(filePath);
    expect(request).toBeCalledWith(requestOptions, expect.anything());

    readStreamSpy.mockRestore();
  });

  it("sets stage name from CLI", async () => {
    const stage = "test";
    delete (serverless.service as any as ServerlessAzureConfig).provider.resourceGroup;
    expect(serverless.service.provider.stage).not.toEqual(stage);
    service = new MockService(serverless, { stage } as any);
    expect(service.getStage()).toEqual(stage);
    expect(service.getResourceGroupName()).toEqual(`sls-wus-${stage}-${serviceName}-rg`);
  });

  it("sets region name from CLI", async () => {
    const region = "East US";
    delete (serverless.service as any as ServerlessAzureConfig).provider.resourceGroup;
    expect(serverless.service.provider.region).not.toEqual(region);
    service = new MockService(serverless, { region } as any);
    expect(service.getRegion()).toEqual(region);
    expect(service.getResourceGroupName()).toEqual(`sls-eus-dev-${serviceName}-rg`);
  });

  it("sets prefix from CLI", async () => {
    const prefix = "prefix";
    delete (serverless.service as any as ServerlessAzureConfig).provider.resourceGroup;
    expect(serverless.service.provider["prefix"]).not.toEqual(prefix);
    service = new MockService(serverless, { prefix } as any);
    expect(service.getPrefix()).toEqual(prefix);
    expect(service.getResourceGroupName()).toEqual(`${prefix}-wus-dev-${serviceName}-rg`);
  });

  it("sets resource group from CLI", async () => {
    const resourceGroup = "resourceGroup";
    delete (serverless.service as any as ServerlessAzureConfig).provider.resourceGroup;
    expect(serverless.service.provider["resourceGroup"]).not.toEqual(resourceGroup);
    service = new MockService(serverless, { resourceGroup } as any);
    expect(service.getResourceGroupName()).toEqual(resourceGroup);
  });

  const cliSubscriptionId = "cli sub id";
  const configSubscriptionId = "config sub id";

  it("sets subscription ID from CLI", async () => {
    process.env.azureSubId = envVarSubscriptionId;
    serverless.service.provider["subscriptionId"] = configSubscriptionId;
    serverless.variables["subscriptionId"] = loginResultSubscriptionId
    service = new MockService(serverless, { subscriptionId: cliSubscriptionId } as any);
    expect(service.getSubscriptionId()).toEqual(cliSubscriptionId);
    expect(serverless.service.provider["subscriptionId"]).toEqual(cliSubscriptionId);
  });

  it("sets subscription ID from environment variable", async () => {
    process.env.azureSubId = envVarSubscriptionId;
    serverless.service.provider["subscriptionId"] = configSubscriptionId;
    serverless.variables["subscriptionId"] = loginResultSubscriptionId
    service = new MockService(serverless, { } as any);
    expect(service.getSubscriptionId()).toEqual(envVarSubscriptionId);
    expect(serverless.service.provider["subscriptionId"]).toEqual(envVarSubscriptionId);
  });

  it("sets subscription ID from config", async () => {
    delete process.env.azureSubId;
    serverless.service.provider["subscriptionId"] = configSubscriptionId;
    serverless.variables["subscriptionId"] = loginResultSubscriptionId
    service = new MockService(serverless, { } as any);
    expect(service.getSubscriptionId()).toEqual(configSubscriptionId);
    expect(serverless.service.provider["subscriptionId"]).toEqual(configSubscriptionId);
  });

  it("sets subscription ID from login result", async () => {
    delete process.env.azureSubId;
    serverless.variables["subscriptionId"] = loginResultSubscriptionId
    service = new MockService(serverless, { } as any);
    expect(service.getSubscriptionId()).toEqual(loginResultSubscriptionId);
    expect(serverless.service.provider["subscriptionId"]).toEqual(loginResultSubscriptionId);
  });
});
