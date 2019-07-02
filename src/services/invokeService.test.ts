import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { MockFactory } from "../test/mockFactory";
import { InvokeService } from "./invokeService";
import { FunctionAppService } from "./functionAppService";
jest.mock("@azure/arm-appservice")
jest.mock("@azure/arm-resources")

describe("Invoke Service ", () => {
  const app = MockFactory.createTestSite();
  const slsService = MockFactory.createTestService();
  const testData = "test-data";
  const result = "result";
  const authKey = "authKey";
  const baseUrl = "https://management.azure.com"
  const masterKeyUrl = `https://${app.defaultHostName}/admin/host/systemkeys/_master`;
  const authKeyUrl = `${baseUrl}${app.id}/functions/admin/token?api-version=2016-08-01`;
  const functionUrl = `http://${slsService.getServiceName()}.azurewebsites.net/api/hello?name=${testData}`;
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
    const service = new InvokeService(sls, options);
    const response = await service.invoke(options["function"], options["data"], options["method"]);
    expect(response.data).toEqual(result);
  });
});