import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import mockFs from "mock-fs";
import path from "path";
import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { FunctionAppService } from "./functionAppService";
import { ArmService } from "./armService";
import { FunctionAppResource } from "../armTemplates/resources/functionApp";

jest.mock("@azure/arm-appservice")
import { WebSiteManagementClient } from "@azure/arm-appservice";
import { ArmDeployment, ArmTemplateType } from "../models/armTemplates";
jest.mock("@azure/arm-resources");

jest.mock("./azureBlobStorageService");
import { AzureBlobStorageService } from "./azureBlobStorageService"
import configConstants from "../config";

describe("Function App Service", () => {
  const app = MockFactory.createTestSite();
  const slsService = MockFactory.createTestService();
  const variables = MockFactory.createTestVariables();
  const provider = MockFactory.createTestAzureServiceProvider();

  const masterKey = "masterKey";
  const authKey = "authKey";
  const syncTriggersMessage = "sync triggers success";
  const deleteFunctionMessage = "delete function success";
  const functions = MockFactory.createTestSlsFunctionConfig();
  const functionsResponse = MockFactory.createTestFunctionsResponse(functions);

  const baseUrl = "https://management.azure.com"
  const masterKeyUrl = `https://${app.defaultHostName}/admin/host/systemkeys/_master`;
  const authKeyUrl = `${baseUrl}${app.id}/functions/admin/token?api-version=2016-08-01`;
  const syncTriggersUrl = `${baseUrl}${app.id}/syncfunctiontriggers?api-version=2016-08-01`;
  const listFunctionsUrl = `${baseUrl}${app.id}/functions?api-version=2016-08-01`;

  const appSettings = {
    setting1: "value1",
    setting2: "value2",
  }

  beforeAll(() => {
    const axiosMock = new MockAdapter(axios);

    // Master Key
    axiosMock.onGet(masterKeyUrl).reply(200, { value: masterKey });
    // Auth Key
    axiosMock.onGet(authKeyUrl).reply(200, authKey);
    // Sync Triggers
    axiosMock.onPost(syncTriggersUrl).reply(200, syncTriggersMessage);
    // List Functions
    axiosMock.onGet(listFunctionsUrl).reply(200, { value: functionsResponse });
    // Delete Function
    for (const funcName of Object.keys(functions)) {
      axiosMock.onDelete(`${baseUrl}${app.id}/functions/${funcName}?api-version=2016-08-01`)
        .reply(200, deleteFunctionMessage);
    }

    mockFs({
      "app.zip": "contents",
      ".serverless": {
        "serviceName.zip": "contents",
      }
    }, { createCwd: true, createTmp: true });
  });

  beforeEach(() => {
    WebSiteManagementClient.prototype.webApps = {
      get: jest.fn(() => app),
      deleteFunction: jest.fn(),
      listApplicationSettings: jest.fn(() => Promise.resolve({ properties: { ...appSettings } })),
      updateApplicationSettings: jest.fn(),
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
      .toBeCalledWith(provider.resourceGroup, FunctionAppResource.getResourceName(slsService as any));
    expect(result).toEqual(app)
  });

  it("get returns null if error occurred", async () => {
    const service = createService();
    WebSiteManagementClient.prototype.webApps = {
      get: jest.fn(() => { return { error: { code: "ResourceNotFound" } } }),
      deleteFunction: jest.fn(),
    } as any;
    const result = await service.get();
    expect(WebSiteManagementClient.prototype.webApps.get)
      .toBeCalledWith(provider.resourceGroup, FunctionAppResource.getResourceName(slsService as any));
    expect(result).toBeNull();
  });

  it("gets master key", async () => {
    const service = createService();
    const result = await service.getMasterKey();
    expect(result).toEqual(masterKey);

  });

  it("deletes function", async () => {
    const service = createService();
    const response = await service.deleteFunction(app, Object.keys(functions)[0]);
    expect(response.data).toEqual(deleteFunctionMessage);

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
    const functionNames = Object.keys(functions);
    expect(result).toHaveLength(functionNames.length);
    const logCalls = (sls.cli.log as any).mock.calls as any[];
    for (let i = 0; i < functionNames.length; i++) {
      const functionName = functionNames[i];
      expect(logCalls[i + 1][0]).toEqual(`-> Deleting function: ${functionName}`);
    }
  });

  it("lists functions", async () => {
    const service = createService();
    expect(await service.listFunctions(app)).toEqual(functionsResponse.map((f) => f.properties));
  });

  describe("Deployments", () => {
    const expectedDeployment: ArmDeployment = {
      parameters: {},
      template: MockFactory.createTestArmTemplate(),
    };

    const expectedSite = MockFactory.createTestSite();

    beforeEach(() => {
      FunctionAppService.prototype.get = jest.fn(() => Promise.resolve(expectedSite));
      (FunctionAppService.prototype as any).sendFile = jest.fn();
      ArmService.prototype.createDeploymentFromConfig = jest.fn(() => Promise.resolve(expectedDeployment));
      ArmService.prototype.createDeploymentFromType = jest.fn(() => Promise.resolve(expectedDeployment));
      ArmService.prototype.deployTemplate = jest.fn(() => Promise.resolve(null));
      WebSiteManagementClient.prototype.webApps = {
        get: jest.fn(() => app),
        deleteFunction: jest.fn(),
        listApplicationSettings: jest.fn(() => Promise.resolve({ properties: { ...appSettings } })),
        updateApplicationSettings: jest.fn(),
      } as any;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    })

    it("deploys ARM templates with custom configuration", async () => {
      slsService.provider["armTemplate"] = {};

      const service = createService();
      const site = await service.deploy();

      expect(site).toEqual(expectedSite);
      expect(ArmService.prototype.createDeploymentFromConfig).toBeCalledWith(slsService.provider["armTemplate"]);
      expect(ArmService.prototype.createDeploymentFromType).not.toBeCalled();
      expect(ArmService.prototype.deployTemplate).toBeCalledWith(expectedDeployment);
    });

    it("deploys ARM template from well-known (default) configuration", async () => {
      slsService.provider["armTemplate"] = null;

      const service = createService();
      const site = await service.deploy();

      expect(site).toEqual(expectedSite);
      expect(ArmService.prototype.createDeploymentFromConfig).not.toBeCalled();
      expect(ArmService.prototype.createDeploymentFromType).toBeCalledWith(ArmTemplateType.Consumption);
      expect(ArmService.prototype.deployTemplate).toBeCalledWith(expectedDeployment);
    });

    it("deploys ARM template from well-known configuration", async () => {
      slsService.provider["armTemplate"] = null;
      slsService.provider["type"] = "premium";

      const service = createService();
      const site = await service.deploy();

      expect(site).toEqual(expectedSite);
      expect(ArmService.prototype.createDeploymentFromConfig).not.toBeCalled();
      expect(ArmService.prototype.createDeploymentFromType).toBeCalledWith(ArmTemplateType.Premium);
      expect(ArmService.prototype.deployTemplate).toBeCalledWith(expectedDeployment);
    });
  });

  it("uploads functions to function app and blob storage", async () => {
    const scmDomain = app.enabledHostNames.find((hostname) => hostname.endsWith("scm.azurewebsites.net"));
    const expectedUploadUrl = `https://${scmDomain}/api/zipdeploy/`;

    const service = createService();
    await service.uploadFunctions(app);

    expect((FunctionAppService.prototype as any).sendFile).toBeCalledWith({
      method: "POST",
      uri: expectedUploadUrl,
      json: true,
      headers: {
        Authorization: `Bearer ${(await variables["azureCredentials"].getToken()).accessToken}`,
        Accept: "*/*",
        ContentType: "application/octet-stream",
      }
    }, slsService["artifact"]);
    const expectedArtifactName = service.getDeploymentName().replace("rg-deployment", "artifact");
    expect((AzureBlobStorageService.prototype as any).uploadFile).toBeCalledWith(
      slsService["artifact"],
      configConstants.deploymentConfig.container,
      `${expectedArtifactName}.zip`,
    )
    const uploadCall = ((AzureBlobStorageService.prototype as any).uploadFile).mock.calls[0];
    expect(uploadCall[2]).toMatch(/.*-t([0-9]+)/)
  });

  it("uploads functions to function app and blob storage with default naming convention", async () => {
    const scmDomain = app.enabledHostNames.find((hostname) => hostname.endsWith("scm.azurewebsites.net"));
    const expectedUploadUrl = `https://${scmDomain}/api/zipdeploy/`;

    const sls = MockFactory.createTestServerless();
    delete sls.service["artifact"]
    const service = createService(sls);
    await service.uploadFunctions(app);

    const defaultArtifact = path.join(".serverless", `${sls.service.getServiceName()}.zip`);

    expect((FunctionAppService.prototype as any).sendFile).toBeCalledWith({
      method: "POST",
      uri: expectedUploadUrl,
      json: true,
      headers: {
        Authorization: `Bearer ${(await variables["azureCredentials"].getToken()).accessToken}`,
        Accept: "*/*",
        ContentType: "application/octet-stream",
      }
    }, defaultArtifact);
    const expectedArtifactName = service.getDeploymentName().replace("rg-deployment", "artifact");
    expect((AzureBlobStorageService.prototype as any).uploadFile).toBeCalledWith(
      defaultArtifact,
      configConstants.deploymentConfig.container,
      `${expectedArtifactName}.zip`,
    )
    const uploadCall = ((AzureBlobStorageService.prototype as any).uploadFile).mock.calls[0];
    expect(uploadCall[2]).toMatch(/.*-t([0-9]+)/)
  });

  it("uploads functions with custom SCM domain (aka App service environments)", async () => {
    const customApp = {
      ...MockFactory.createTestSite("CustomAppWithinASE"),
      enabledHostNames: [
        "myapi.customase.p.azurewebsites.net",
        "myapi.scm.customase.p.azurewebsites.net"
      ],
    }

    const expectedUploadUrl = `https://${customApp.enabledHostNames[1]}/api/zipdeploy/`;

    const service = createService();
    await service.uploadFunctions(customApp);

    expect((FunctionAppService.prototype as any).sendFile).toBeCalledWith({
      method: "POST",
      uri: expectedUploadUrl,
      json: true,
      headers: {
        Authorization: `Bearer ${(await variables["azureCredentials"].getToken()).accessToken}`,
        Accept: "*/*",
        ContentType: "application/octet-stream",
      }
    }, slsService["artifact"])
  });

  it("uses default name when no artifact provided", async () => {
    const sls = MockFactory.createTestServerless();
    delete sls.service["artifact"];
    const service = createService(sls);
    expect(service.getFunctionZipFile()).toEqual(path.join(".serverless", `${sls.service.getServiceName()}.zip`))
  });

  it("uses package param from options if provided", async () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions({
      package: "fake.zip",
    });
    const service = createService(sls, options);
    expect(service.getFunctionZipFile()).toEqual("fake.zip")
  });

  it("adds a new function app setting", async () => {
    const service = createService();
    const settingName = "TEST_SETTING";
    const settingValue = "TEST_VALUE"
    await service.updateFunctionAppSetting(app, settingName, settingValue);
    expect(WebSiteManagementClient.prototype.webApps.updateApplicationSettings).toBeCalledWith(
      "myResourceGroup",
      "Test",
      {
        ...appSettings,
        TEST_SETTING: settingValue
      }
    )
  });

  it("updates an existing function app setting", async () => {
    const service = createService();
    const settingName = "setting1";
    const settingValue = "TEST_VALUE"
    await service.updateFunctionAppSetting(app, settingName, settingValue);
    expect(WebSiteManagementClient.prototype.webApps.updateApplicationSettings).toBeCalledWith(
      "myResourceGroup",
      "Test",
      {
        setting1: settingValue,
        setting2: appSettings.setting2
      }
    );
  });

  describe("Updating Function App Settings", () => {

    const sasUrl = "sasUrl"

    beforeEach(() => {
      FunctionAppService.prototype.updateFunctionAppSetting = jest.fn();
      AzureBlobStorageService.prototype.generateBlobSasTokenUrl = jest.fn(() => Promise.resolve(sasUrl));
    });

    afterEach(() => {
      (FunctionAppService.prototype.updateFunctionAppSetting as any).mockRestore();
    });

    it("updates WEBSITE_RUN_FROM_PACKAGE with SAS URL if configured to run from blob", async () => {
      const newSlsService = MockFactory.createTestService();
      newSlsService.provider["deployment"] = {
        runFromBlobUrl: true,
      }

      const service = createService(MockFactory.createTestServerless({
        service: newSlsService,
      }));
      await service.uploadFunctions(app);
      expect(AzureBlobStorageService.prototype.generateBlobSasTokenUrl).toBeCalled();
      expect(FunctionAppService.prototype.updateFunctionAppSetting).toBeCalledWith(
        app,
        "WEBSITE_RUN_FROM_PACKAGE",
        sasUrl
      );
    });

    it("does not generate SAS URL or update WEBSITE_RUN_FROM_PACKAGE if not configured to run from blob", async() => {
      const service = createService();
      await service.uploadFunctions(app);
      expect(AzureBlobStorageService.prototype.generateBlobSasTokenUrl).not.toBeCalled();
      expect(FunctionAppService.prototype.updateFunctionAppSetting).not.toBeCalled();
    });
  });


});
