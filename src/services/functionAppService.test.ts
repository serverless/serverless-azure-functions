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
  
  const app = MockFactory.createTestFunctionApp();
  const slsService = MockFactory.createTestService();
  const variables = MockFactory.createTestVariables();
  const provider = MockFactory.createTestAzureServiceProvider();

  let sendFile;
  let webAppDelete;

  const masterKey = "masterKey";
  const authKey = "authKey";
  const syncTriggersMessage = "sync triggers success";
  const functions = MockFactory.createTestFunctions();

  const masterKeyUrl = `https://${app.defaultHostName}/admin/host/systemkeys/_master`;
  const authKeyUrl = `https://management.azure.com${app.id}/functions/admin/token?api-version=2016-08-01`;
  const syncTriggersUrl = `https://management.azure.com${app.id}/syncfunctiontriggers?api-version=2016-08-01`;
  const listFunctionsUrl = `https://management.azure.com${app.id}/functions?api-version=2016-08-01`;
  const uploadUrl = `https://${app.name}${constants.scmDomain}${constants.scmZipDeployApiPath}`

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

    mockFs({
      "app.zip": "contents",
    }, {createCwd: true, createTmp: true});
  });

  beforeEach(() => {
    webAppDelete = jest.fn();
    sendFile = jest.fn((options, zipFile) => {
      if (options.headers.Authorization === null) {
        throw new Error();
      }
    });

    WebSiteManagementClient.prototype.webApps = {
      get: jest.fn(() => app),
      deleteFunction: webAppDelete,
    } as any;
    (FunctionAppService.prototype as any).sendFile = sendFile;
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
      deleteFunction: webAppDelete,
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
    await service.deleteFunction(app.name);
    expect(WebSiteManagementClient.prototype.webApps.deleteFunction).toBeCalledWith(
      provider.resourceGroup,
      slsService["service"],
      app.name
    );
  });

  it("syncs triggers", async () => {
    const service = createService();
    const result = await service.syncTriggers(app);
    expect(result.data).toEqual(syncTriggersMessage)
  });

  it("cleans up", async () => {
    const sls = MockFactory.createTestServerless();
    const service = createService(sls);
    const result = await service.cleanUp(app);
    expect(result).toHaveLength(functions.length);
    const logCalls = (sls.cli.log as any).mock.calls as any[];
    for (let i = 0; i < functions.length; i++) {
      const functionName = `function${i+1}`
      expect(logCalls[i + 1][0]).toEqual(`-> Deleting function: '${functionName}'`);
    }
  });

  it("lists functions", async () => {
    const service = createService();
    expect(await service.listFunctions(app)).toEqual(functions);
  });

  it("uploads functions", async () => {
    const service = createService();
    await service.uploadFunctions(app);
    expect(sendFile).toBeCalledWith({
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