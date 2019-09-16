import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { MockFactory } from "../test/mockFactory";
import { InvokeService } from "./invokeService";
jest.mock("@azure/arm-appservice")
jest.mock("@azure/arm-resources")
jest.mock("./functionAppService")
import { FunctionAppService } from "./functionAppService";
import configConstants from "../config";

describe("Invoke Service ", () => {
  const app = MockFactory.createTestSite();
  const expectedSite = MockFactory.createTestSite();
  const testData = "test-data";
  const testResult = "test result";
  const authKey = "authKey";
  const baseUrl = "https://management.azure.com"
  const masterKeyUrl = `https://${app.defaultHostName}/admin/host/systemkeys/_master`;
  const authKeyUrl = `${baseUrl}${app.id}/functions/admin/token?api-version=2016-08-01`;
  const functionName = "hello";
  const urlPOST = `http://${app.defaultHostName}/api/${functionName}`;
  const urlGET = `http://${app.defaultHostName}/api/${functionName}?name%3D${testData}`;
  const localUrl = `http://localhost:${configConstants.defaults.localPort}/api/${functionName}`
  let masterKey: string;
  let sls = MockFactory.createTestServerless();
  let options = {
    function: functionName,
    data: JSON.stringify({name: testData}),
    method: "GET"
  } as any;

  beforeAll(() => {
    const axiosMock = new MockAdapter(axios);
    // Master Key
    axiosMock.onGet(masterKeyUrl).reply(200, { value: masterKey });
    // Auth Key
    axiosMock.onGet(authKeyUrl).reply(200, authKey);
    // Mock url for GET
    axiosMock.onGet(urlGET).reply(200, testResult);
    // Mock url for POST
    axiosMock.onPost(urlPOST).reply(200, testResult);
    // Mock url for local POST
    axiosMock.onPost(localUrl).reply(200, testResult);
  });

  beforeEach(() => {
    FunctionAppService.prototype.getMasterKey = jest.fn();
    FunctionAppService.prototype.get = jest.fn(() => Promise.resolve(expectedSite));
    FunctionAppService.prototype.getFunctionHttpTriggerConfig = jest.fn(() => {
      return { url: `${app.defaultHostName}/api/hello` }
    }) as any;
    sls = MockFactory.createTestServerless();
    options = {
      function: functionName,
      data: JSON.stringify({name: testData}),
      method: "GET"
    } as any;
  });

  it("Invokes a function with GET request", async () => {
    const service = new InvokeService(sls, options);
    const response = await service.invoke(options.method, options.function, options.data);
    expect(JSON.stringify(response.data)).toEqual(JSON.stringify(testResult));
  });

  it("Invokes a function with POST request", async () => {
    const service = new InvokeService(sls, options);
    const response = await service.invoke(options.method, options.function, options.data);
    expect(JSON.stringify(response.data)).toEqual(JSON.stringify(testResult));
    expect(FunctionAppService.prototype.getFunctionHttpTriggerConfig).toBeCalled();
    expect(FunctionAppService.prototype.get).toBeCalled();
    expect(FunctionAppService.prototype.getMasterKey).toBeCalled();
  });

  it("Invokes a local function", async () => {
    options.method = "POST";
    const service = new InvokeService(sls, options, true);
    const response = await service.invoke(options.method, options.function, options.data);
    expect(JSON.stringify(response.data)).toEqual(JSON.stringify(testResult));
    expect(FunctionAppService.prototype.getFunctionHttpTriggerConfig).not.toBeCalled();
    expect(FunctionAppService.prototype.get).not.toBeCalled();
    expect(FunctionAppService.prototype.getMasterKey).not.toBeCalled();
  });
});
