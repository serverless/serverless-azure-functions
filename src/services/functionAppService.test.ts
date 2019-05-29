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
import { BaseService } from "./baseService";

describe("Function App Service", () => {

  const app = MockFactory.createTestFunctionApp();
  const slsService = MockFactory.createTestService();
  const variables = MockFactory.createTestVariables();
  const provider = MockFactory.createTestAzureServiceProvider();
  const apiRequest = jest.fn((method, url) => {
    return {
      
    }[method][url]
  });
  const sendFile = jest.fn();

  beforeAll(() => {
    WebSiteManagementClient.prototype.webApps = {
      get: jest.fn(() => app),
      deleteFunction: jest.fn(),
    } as any;
    axios.prototype = jest.fn();
    (FunctionAppService.prototype as any).sendApiRequest = apiRequest;
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
    const service = createService();
    const result = await service.get();
    expect(WebSiteManagementClient.prototype.webApps.get)
      .toBeCalledWith(provider.resourceGroup, slsService["service"]);
    expect(result).toEqual(app)
  });

  it("gets master key", async () => {
    const service = createService();
    const masterKey = await service.getMasterKey();
  });

  it("deletes function", async () => {
    const service = createService();
    await service.deleteFunction(app.name);
    expect(WebSiteManagementClient.prototype.webApps.deleteFunction).toBeCalledWith(
      provider.resourceGroup,
      slsService["service"],
      app.name
    );
  });

  it("syncs triggers", async () => {
    const service = createService();
    await service.syncTriggers(app);
    expect(apiRequest).toBeCalledWith(
      'POST',
      `https://management.azure.com${app.id}/syncfunctiontriggers?api-version=2016-08-01`
    )
  });

  it("cleans up", async () => {
    const service = createService();
    await service.cleanUp(app);
  });

  it("lists functions", async () => {
    const service = createService();
    service.listFunctions(app);
  });

  it("uploads functions", async () => {
    const service = createService();
    await service.uploadFunctions(app);
  });
});