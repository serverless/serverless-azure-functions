import mockFs from "mock-fs"
import { MockFactory } from "../test/mockFactory";
import Serverless from "serverless";
import { FunctionAppService } from "./functionAppService";
import { constants } from "../config"

jest.mock("@azure/arm-resources")

jest.mock("@azure/arm-appservice")
import { WebSiteManagementClient } from "@azure/arm-appservice";

import axios from "axios";
import MockAdapter from "axios-mock-adapter";

describe("Function App Service", () => {
  
  const app = MockFactory.createTestSite();
  const slsService = MockFactory.createTestService();
  const variables = MockFactory.createTestVariables();
  const provider = MockFactory.createTestAzureServiceProvider();
  const functionName = "function1";

  const masterKey = "masterKey";
  const authKey = "authKey";
  const syncTriggersMessage = "sync triggers success";
  const deleteFunctionMessage = "delete function success";
  const functions = MockFactory.createTestFunctions();

  const baseUrl = "https://management.azure.com"
  const masterKeyUrl = `https://${app.defaultHostName}/admin/host/systemkeys/_master`;
  const authKeyUrl = `${baseUrl}${app.id}/functions/admin/token?api-version=2016-08-01`;
  const syncTriggersUrl = `${baseUrl}${app.id}/syncfunctiontriggers?api-version=2016-08-01`;
  const listFunctionsUrl = `${baseUrl}${app.id}/functions?api-version=2016-08-01`;
  const uploadUrl = `https://${app.enabledHostNames[0]}${constants.scmZipDeployApiPath}/`

  beforeAll(() => {   

    // TODO: How to spy on defaul exported function?
    const axiosMock = new MockAdapter(axios);
    
    // Master Key
    axiosMock.onGet(masterKeyUrl).reply(200, { value: masterKey });
    // Auth Key
    axiosMock.onGet(authKeyUrl).reply(200, authKey);  
    // Sync Triggers
    axiosMock.onPost(syncTriggersUrl).reply(200, syncTriggersMessage);
    // List Functions
    axiosMock.onGet(listFunctionsUrl).reply(200, { value: functions });
    // Delete Function
    for (const funcName of Object.keys(functions)) {
      const func = functions[funcName];
      axiosMock.onDelete(`${baseUrl}${app.id}/functions/${func.properties.name}?api-version=2016-08-01`)
        .reply(200, deleteFunctionMessage);
    }

    mockFs({
      "app.zip": "contents",
    }, {createCwd: true, createTmp: true});
  });

  beforeEach(() => {

    WebSiteManagementClient.prototype.webApps = {
      get: jest.fn(() => app),
      deleteFunction: jest.fn(),
    } as any;
    (FunctionAppService.prototype as any).sendFile = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  })

  afterAll(() => {
    mockFs.restore();
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

  it("get returns null if error occurred", async () => {
    const service = createService();
    WebSiteManagementClient.prototype.webApps = {
      get: jest.fn(() => { return { error: { code: "ResourceNotFound"}}}),
      deleteFunction: jest.fn(),
    } as any;
    const result = await service.get();
    expect(WebSiteManagementClient.prototype.webApps.get)
      .toBeCalledWith(provider.resourceGroup, slsService["service"]);
    expect(result).toBeNull();
  });

  it("gets master key", async () => {
    const service = createService();
    const masterKey = await service.getMasterKey();
    expect(masterKey).toEqual(masterKey);
    
  });

  it("deletes function", async () => {
    const service = createService();
    const response = await service.deleteFunction(app, functionName);
    expect(response.data).toEqual(deleteFunctionMessage);
    
  });

  it("syncs triggers", async () => {
    const service = createService();
    const result = await service.syncTriggers(app);
    expect(result.data).toEqual(syncTriggersMessage)
  });

  it("cleans up", async () => {
    const sls = MockFactory.createTestServerless({
      service: slsService,
      variables: variables,
    });
    const service = createService(sls);
    const result = await service.cleanUp(app);
    const functionNames = Object.keys(functions);
    expect(result).toHaveLength(functionNames.length);
    const logCalls = (sls.cli.log as any).mock.calls as any[];
    for (let i = 0; i < functionNames.length; i++) {
      const functionName = `function${i+1}`
      expect(logCalls[i + 1][0]).toEqual(`-> Deleting function: ${functionName}`);
    }
  });

  it("lists functions", async () => {
    const service = createService();
    expect(await service.listFunctions(app)).toEqual(functions.map((f) => f.properties));
  });

  it("uploads functions", async () => {
    const service = createService();
    await service.uploadFunctions(app);
    expect((FunctionAppService.prototype as any).sendFile).toBeCalledWith({
      method: "POST",
      uri: uploadUrl,
      json: true,
      headers: {
        Authorization: `Bearer ${variables["azureCredentials"].tokenCache._entries[0].accessToken}`,
        Accept: "*/*",
        ContentType: "application/octet-stream",
      }
    }, slsService["artifact"])
  });

  it("throws an error with no zip file", async () => {
    const sls = MockFactory.createTestServerless();
    delete sls.service["artifact"];
    const service = createService(sls);
    await expect(service.uploadFunctions(app)).rejects.not.toBeNull()
  });
});