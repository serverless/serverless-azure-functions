import Serverless from "serverless";
import { BaseService } from "./baseService";
import { MockFactory } from "../test/mockFactory";
jest.mock("axios", () => jest.fn());
import axios from "axios";

class TestService extends BaseService {
  public constructor(serverless: Serverless, options?: Serverless.Options) {
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
  let service: TestService;
  let sls: Serverless;

  const slsConfig = {
    service: "My custom service",
    provider: {
      resourceGroup: "My-Resource-Group",
      deploymentName: "My-Deployment",
    },
  };

  beforeEach(() => {
    sls = MockFactory.createTestServerless();
    sls.variables["azureCredentials"] = MockFactory.createTestAzureCredentials();
    sls.variables["subscriptionId"] = "ABC123";
    Object.assign(sls.service, slsConfig);
    service = new TestService(sls);
  });

  it("Initializes common service properties", () => {
    const props = service.getProperties();
    expect(props.baseUrl).toEqual("https://management.azure.com");
    expect(props.credentials).toEqual(sls.variables["azureCredentials"]);
    expect(props.subscriptionId).toEqual(sls.variables["subscriptionId"]);
    expect(props.serviceName).toEqual(slsConfig.service);
    expect(props.resourceGroup).toEqual(slsConfig.provider.resourceGroup);
    expect(props.deploymentName).toEqual(slsConfig.provider.deploymentName);
  });

  it("Fails if credentials have not been set in serverless config", () => {
    sls.variables["azureCredentials"] = null;
    expect(() => new TestService(sls)).toThrow()
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
  })
});