import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { constants } from "../shared/constants";
import { MockFactory } from "../test/mockFactory";
import { InvokeService, InvokeMode } from "./invokeService";

jest.mock("@azure/arm-appservice")
jest.mock("@azure/arm-resources")

jest.mock("./functionAppService");
import { FunctionAppService } from "./functionAppService";
import { ApimResource } from "../armTemplates/resources/apim";


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
  const urlGET = `http://${app.defaultHostName}/api/${functionName}?name=${testData}`;
  const localUrl = `http://localhost:${constants.defaults.localPort}/api/${functionName}`;
  const apimUrl = `https://sls-eus2-dev-d99fe2-apim.azure-api.net/api/${functionName}`;

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
    // Mock url for APIM POST
    axiosMock.onPost(apimUrl).reply(200, testResult);
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
    const service = new InvokeService(sls, options, InvokeMode.LOCAL);
    const response = await service.invoke(options.method, options.function, options.data);
    expect(JSON.stringify(response.data)).toEqual(JSON.stringify(testResult));
    expect(FunctionAppService.prototype.getFunctionHttpTriggerConfig).not.toBeCalled();
    expect(FunctionAppService.prototype.get).not.toBeCalled();
    expect(FunctionAppService.prototype.getMasterKey).not.toBeCalled();
  });

  it("Invokes an APIM function", async () => {
    options.method = "POST";
    const getResourceNameSpy = jest.spyOn(ApimResource, "getResourceName");
    const service = new InvokeService(sls, options, InvokeMode.APIM);
    const response = await service.invoke(options.method, options.function, options.data);
    expect(JSON.stringify(response.data)).toEqual(JSON.stringify(testResult));
    expect(FunctionAppService.prototype.getFunctionHttpTriggerConfig).not.toBeCalled();
    expect(FunctionAppService.prototype.get).not.toBeCalled();
    // Get Master Key should still be called for APIM
    expect(FunctionAppService.prototype.getMasterKey).toBeCalled();
    expect(getResourceNameSpy).toBeCalled();
  });

  it("Does not try to invoke a non-existent function", async () => {
    const service = new InvokeService(sls, options);
    const fakeName = "fakeFunction";
    await service.invoke("GET", fakeName);
    expect(sls.cli.log).lastCalledWith(`Function ${fakeName} does not exist`)
  });
});
