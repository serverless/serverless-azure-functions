import fs from "fs";
import mockFs from "mock-fs";
import Serverless from "serverless";
import { ServerlessAzureOptions } from "../models/serverless";
import { MockFactory } from "../test/mockFactory";
import { BaseService } from "./baseService";

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

  const slsConfig = {
    service: "My custom service",
    provider: {
      resourceGroup: "My-Resource-Group",
      deploymentName: "My-Deployment",
    },
  };

  afterAll(() => {
    mockFs.restore();
  });

  function createMockService(options?: Serverless.Options) {
    sls = MockFactory.createTestServerless();
    sls.variables["azureCredentials"] = MockFactory.createTestAzureCredentials();
    sls.variables["subscriptionId"] = "ABC123";
    Object.assign(sls.service, slsConfig);

    return new MockService(sls, options);
  }

  beforeEach(() => {
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
});
