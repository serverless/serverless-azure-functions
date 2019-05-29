import mockfs from "mock-fs"
import { MockFactory } from "../test/mockFactory";
import Serverless from "serverless";
import { FunctionAppService } from "./functionAppService";

jest.mock("@azure/arm-resources")
import { ResourceManagementClient } from "@azure/arm-resources";

jest.mock("@azure/arm-appservice")
import { WebSiteManagementClient } from "@azure/arm-appservice";

jest.mock("axios")
import axios from "axios";

describe("Function App Service", () => {

  const defaultFunctionApp = MockFactory.createTestFunctionApp();
  const subId = "mySubId";
  const credentials = "myCredentials";
  const resourceGroup = "myResourceGroup";
  const serviceName = "myServiceName";
  const deploymentName = "myDeploymentName";
  const artifact = "app.zip";

  beforeAll(() => {
    WebSiteManagementClient.prototype.webApps = {
      get: jest.fn(() => defaultFunctionApp)
    } as any;
    axios.prototype = jest.fn();
  });

  afterAll(() => {

  });

  
  function createSls() {
    const sls = MockFactory.createTestServerless();
    sls.variables["azureCredentials"] = credentials
    sls.variables["subscriptionId"] = subId;
    sls.service["service"] = serviceName;
    sls.service.provider["resourceGroup"] = resourceGroup;
    sls.service.provider["deploymentName"] = deploymentName;
    sls.service["artifact"] = artifact;
    return sls;
  }

  function createOptions() {
    const options = MockFactory.createTestServerlessOptions();
    return options;
  }

  function createService(sls?: Serverless, options?: Serverless.Options) {
    
    return new FunctionAppService(
      sls || createSls(),
      options || createOptions()
    )
  } 
  
  it("get returns function app", async () => {
    const service = createService();
    const result = await service.get();
    expect(WebSiteManagementClient.prototype.webApps.get)
      .toBeCalledWith(resourceGroup, serviceName);
    expect(result).toEqual(defaultFunctionApp)
  });

  it("gets master key", () => {
    const service = createService();
    const key = service.getMasterKey();
    const calls = axios.prototype.mock.calls;
    const a = 4;
    fail();
  });
});