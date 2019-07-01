import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import mockFs from "mock-fs";
import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { InvokeService } from "./invokeService";
import { Site } from "@azure/arm-appservice/esm/models";
import { FunctionAppService } from "./functionAppService";
jest.mock("@azure/arm-appservice")
import { WebSiteManagementClient } from "@azure/arm-appservice";
jest.mock("@azure/arm-resources")

describe("Invoke Service ", () => {
  const app = MockFactory.createTestSite();
  const slsService = MockFactory.createTestService();
  const variables = MockFactory.createTestVariables();
  const provider = MockFactory.createTestAzureServiceProvider();
  const functionName = "test";
  const testData = "test-data";
  const result = "result";
  const authKey = "authKey";
  const baseUrl = "https://management.azure.com"
  const masterKeyUrl = `https://${app.defaultHostName}/admin/host/systemkeys/_master`;
  const authKeyUrl = `${baseUrl}${app.id}/functions/admin/token?api-version=2016-08-01`;
  const functionUrl = `http://${slsService.getServiceName()}.azurewebsites.net/api/hello?name=${testData}`;
  let functionApp: Site;
  let masterKey: string;

  beforeAll(() => {

    const axiosMock = new MockAdapter(axios);
    
    // Master Key
    axiosMock.onGet(masterKeyUrl).reply(200, { value: masterKey });
    // Auth Key
    axiosMock.onGet(authKeyUrl).reply(200, authKey);
    axiosMock.onGet(functionUrl).reply(200, result);
  });
  beforeEach(() => {
    FunctionAppService.prototype.getMasterKey = jest.fn();
  });


  it("Invokes a function", async () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    options["function"] = "hello";
    options["data"] = `{"name": "${testData}"}`;
    options["method"] = "GET";

    //"http://serviceName.azurewebsites.net/api/hello?name=Test-Data"
    const service = new InvokeService(sls, options);
    const response = await service.invoke(options["function"], options["data"], options["method"]);
    expect(response.data).toEqual(result);
  });
});