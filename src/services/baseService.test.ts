import fs from "fs";
import {vol} from "memfs"
import Serverless from "serverless";
import { ServerlessAzureOptions } from "../models/serverless";
import { MockFactory } from "../test/mockFactory";
import { BaseService } from "./baseService";

jest.mock("./loggingService");
import { LoggingService } from "./loggingService";

jest.mock("axios", () => jest.fn());
import axios from "axios";

jest.mock("request", () => MockFactory.createTestMockRequestFactory());
import request from "request";
import { Runtime } from "../config/runtime";

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

  public err(message: string) {
    this.error(message);
  }

  public war(message: string) {
    this.warn(message);
  }

  public inf(message: string) {
    this.info(message);
  }

  public deb(message: string) {
    this.debug(message);
  }
}

describe("Base Service", () => {
  let service: MockService;
  let serverless: Serverless;

  const serviceName = "my-custom-service";
  
  const slsConfig = {
    service: serviceName,
    provider: {
      resourceGroup: "My-Resource-Group",
      deploymentName: "My-Deployment",
      runtime: Runtime.NODE10
    },
  };

  afterAll(() => {
    vol.reset();
  });

  function createMockService(sls: Serverless, options?: Serverless.Options) {
    sls.variables["azureCredentials"] = MockFactory.createTestAzureCredentials();
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
    vol.fromNestedJSON({
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

  it("calls LoggingService", () => {
    const mockService = new MockService(serverless);
    
    mockService.err("error");
    expect(LoggingService.prototype.error).toBeCalledWith("error");

    mockService.war("warn");
    expect(LoggingService.prototype.warn).toBeCalledWith("warn");

    mockService.inf("info");
    expect(LoggingService.prototype.info).toBeCalledWith("info");

    mockService.deb("debug");
    expect(LoggingService.prototype.debug).toBeCalledWith("debug");
  });
});
