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
  let sls: Serverless;
  const serviceName = "my-custom-service"

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

  function createMockService(options?: Serverless.Options) {
    sls.variables["azureCredentials"] = MockFactory.createTestAzureCredentials();
    sls.variables["subscriptionId"] = "ABC123";
    Object.assign(sls.service, slsConfig);

    return new MockService(sls, options);
  }

  beforeEach(() => {
    sls = MockFactory.createTestServerless();
    service = createMockService();
  });

  it("Initializes common service properties", () => {
    const props = service.getProperties();
    expect(props.baseUrl).toEqual("https://management.azure.com");
    expect(props.credentials).toEqual(sls.variables["azureCredentials"]);
    expect(props.subscriptionId).toEqual(sls.variables["subscriptionId"]);
    expect(props.serviceName).toEqual(slsConfig.service);
    expect(props.resourceGroup).toEqual(slsConfig.provider.resourceGroup);
    const expectedDeploymentNameRegex = new RegExp(slsConfig.provider.deploymentName + "-t([0-9]+)")
    expect(props.deploymentName).toMatch(expectedDeploymentNameRegex);
  });

  it("Sets default region and stage values if not defined", () => {
    const mockService = new MockService(sls);

    expect(mockService).not.toBeNull();
    expect(sls.service.provider.region).toEqual("westus");
    expect(sls.service.provider.stage).toEqual("dev");
  });

  it("returns region and stage based on CLI options", () => {
    const cliOptions = {
      stage: "prod",
      region: "eastus2",
    };
    const mockService = new MockService(sls, cliOptions);

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

    const mockService = new MockService(sls, cliOptions);
    const actualResourceGroupName = mockService.getResourceGroupName();

    expect(actualResourceGroupName).toEqual(resourceGroupName);
  });

  it("use the resource group name from sls yaml config", () => {
    const mockService = new MockService(sls);
    const actualResourceGroupName = mockService.getResourceGroupName();

    expect(actualResourceGroupName).toEqual(sls.service.provider["resourceGroup"]);
  });

  it("Generates resource group from convention when NOT defined in sls yaml", () => {
    sls.service.provider["resourceGroup"] = null;
    const mockService = new MockService(sls);
    const actualResourceGroupName = mockService.getResourceGroupName();
    const expectedRegion = AzureNamingService.createShortAzureRegionName(mockService.getRegion());
    const expectedStage = AzureNamingService.createShortStageName(mockService.getStage());
    const expectedResourceGroupName = `sls-${expectedRegion}-${expectedStage}-${sls.service["service"]}-rg`;

    expect(actualResourceGroupName).toEqual(expectedResourceGroupName);
  });

  it("set default prefix when one is not defined in yaml config", () => {
    const mockService = new MockService(sls);
    const actualPrefix = mockService.getPrefix();
    expect(actualPrefix).toEqual("sls");
  });

  it("use the prefix defined in sls yaml config", () => {
    const expectedPrefix = "testPrefix"
    sls.service.provider["prefix"] = expectedPrefix;
    const mockService = new MockService(sls);
    const actualPrefix = mockService.getPrefix();

    expect(actualPrefix).toEqual(expectedPrefix);
  });

  it("Fails if credentials have not been set in serverless config", () => {
    sls.variables["azureCredentials"] = null;
    expect(() => new MockService(sls)).toThrow()
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
    delete (sls.service as any as ServerlessAzureConfig).provider.resourceGroup;
    expect(sls.service.provider.stage).not.toEqual(stage);
    service = new MockService(sls, { stage } as any);
    expect(service.getStage()).toEqual(stage);
    expect(service.getResourceGroupName()).toEqual(`sls-wus-${stage}-${serviceName}-rg`);
  });

  it("sets region name from CLI", async () => {
    const region = "East US";
    delete (sls.service as any as ServerlessAzureConfig).provider.resourceGroup;
    expect(sls.service.provider.region).not.toEqual(region);
    service = new MockService(sls, { region } as any);
    expect(service.getRegion()).toEqual(region);
    expect(service.getResourceGroupName()).toEqual(`sls-eus-dev-${serviceName}-rg`);
  });

  it("sets prefix from CLI", async () => {
    const prefix = "prefix";
    delete (sls.service as any as ServerlessAzureConfig).provider.resourceGroup;
    expect(sls.service.provider["prefix"]).not.toEqual(prefix);
    service = new MockService(sls, { prefix } as any);
    expect(service.getPrefix()).toEqual(prefix);
    expect(service.getResourceGroupName()).toEqual(`${prefix}-wus-dev-${serviceName}-rg`);
  });

  it("sets resource group from CLI", async () => {
    const resourceGroup = "resourceGroup";
    delete (sls.service as any as ServerlessAzureConfig).provider.resourceGroup;
    expect(sls.service.provider["resourceGroup"]).not.toEqual(resourceGroup);
    service = new MockService(sls, { resourceGroup } as any);
    expect(service.getResourceGroupName()).toEqual(resourceGroup);
  });
});
