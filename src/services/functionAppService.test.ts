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

  const defaultApp = MockFactory.createTestFunctionApp();
  const slsService = MockFactory.createTestService();
  const variables = MockFactory.createTestVariables();
  const provider = MockFactory.createTestAzureServiceProvider();

  beforeAll(() => {
    WebSiteManagementClient.prototype.webApps = {
      get: jest.fn(() => defaultApp)
    } as any;
    axios.prototype = jest.fn();
  });

  afterAll(() => {

  });

  function createService(sls?: Serverless, options?: Serverless.Options) {
    return new FunctionAppService(
      sls || MockFactory.createTestServerless({
        service: slsService,
        variables: variables,
      }),
      options || MockFactory.createTestServerlessOptions()
    )
  } 
  
  it("get returns function app", async () => {
    const functionAppService = createService();
    const result = await functionAppService.get();
    expect(WebSiteManagementClient.prototype.webApps.get)
      .toBeCalledWith(provider.resourceGroup, slsService["service"]);
    expect(result).toEqual(defaultApp)
  });

  it("gets master key", () => {
    
  });
});