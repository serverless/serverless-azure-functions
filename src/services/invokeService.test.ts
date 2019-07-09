import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { MockFactory } from "../test/mockFactory";
import { InvokeService } from "./invokeService";
jest.mock("@azure/arm-appservice")
jest.mock("@azure/arm-resources")
jest.mock("./functionAppService")
import { FunctionAppService } from "./functionAppService";

describe("Invoke Service ", () => {
  const app = MockFactory.createTestSite();
  const expectedSite = MockFactory.createTestSite();
  const testData = "test-data";
  const testResult = "test-data";
  const authKey = "authKey";
  const baseUrl = "https://management.azure.com"
  const masterKeyUrl = `https://${app.defaultHostName}/admin/host/systemkeys/_master`;
  const authKeyUrl = `${baseUrl}${app.id}/functions/admin/token?api-version=2016-08-01`;
  let urlPOST = `http://${app.defaultHostName}/api/hello`;
  let urlGET = `http://${app.defaultHostName}/api/hello?name%3D${testData}`;
  let masterKey: string;

  beforeAll(() => {
    const axiosMock = new MockAdapter(axios);
    // Master Key
    axiosMock.onGet(masterKeyUrl).reply(200, { value: masterKey });
    // Auth Key
    axiosMock.onGet(authKeyUrl).reply(200, authKey);
    //Mock url for GET
    axiosMock.onGet(urlGET).reply(200, testResult);
    //Mock url for POST
    axiosMock.onPost(urlPOST).reply(200, testResult);
  });
  
  beforeEach(() => {
    FunctionAppService.prototype.getMasterKey = jest.fn();
    FunctionAppService.prototype.get = jest.fn(() => Promise.resolve(expectedSite));
  });

  it("Invokes a function with GET request", async () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const expectedResult = {url: `${app.defaultHostName}/api/hello`};
    const httpConfig = jest.fn(() => expectedResult);

    FunctionAppService.prototype.getFunctionHttpTriggerConfig = httpConfig as any;

    options["function"] = "hello";
    options["data"] = `{"name": "${testData}"}`;
    options["method"] = "GET";

    const service = new InvokeService(sls, options);
    const response = await service.invoke(options["method"], options["function"], options["data"]);
    expect(JSON.stringify(response.data)).toEqual(JSON.stringify(testResult));
  });

  it("Invokes a function with POST request", async () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const expectedResult = {url: `${app.defaultHostName}/api/hello`};
    const httpConfig = jest.fn(() => expectedResult);
    FunctionAppService.prototype.getFunctionHttpTriggerConfig = httpConfig as any;

    options["function"] = "hello";
    options["data"] = `{"name": "${testData}"}`;
    options["method"] = "POST";

    const service = new InvokeService(sls, options);
    const response = await service.invoke(options["method"], options["function"], options["data"]);
    expect(JSON.stringify(response.data)).toEqual(JSON.stringify(testResult));
  });
  
});