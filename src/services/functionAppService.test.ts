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
import { Utils } from "../shared/utils";
import { ServerlessAzureConfig } from "../models/serverless";

describe("Function App Service", () => {
  const app = MockFactory.createTestSite();
  const slsService = MockFactory.createTestService();
  const config: ServerlessAzureConfig = slsService as any;
  const variables = MockFactory.createTestVariables();
  const provider = MockFactory.createTestAzureServiceProvider();

  const masterKey = "masterKey";
  const authKey = "authKey";
  const subscriptionId = "subId";
  const syncTriggersMessage = "sync triggers success";
  const deleteFunctionMessage = "delete function success";
  const functions = MockFactory.createTestSlsFunctionConfig();
  const functionsResponse = MockFactory.createTestFunctionsResponse(functions);

  const baseUrl = "https://management.azure.com"
  const masterKeyUrl = `https://${app.defaultHostName}/admin/host/systemkeys/_master`;
  const authKeyUrl = `${baseUrl}${app.id}/functions/admin/token?api-version=2016-08-01`;
  const syncTriggersUrl = `${baseUrl}/subscriptions/${subscriptionId}` +
    `/resourceGroups/${config.provider.resourceGroup}/providers/Microsoft.Web/sites/${app.name}` +
    "/syncfunctiontriggers?api-version=2016-08-01";
  const listFunctionsUrl = `${baseUrl}${app.id}/functions?api-version=2016-08-01`;
  const appSettingsUrl = `${baseUrl}/subscriptions/${subscriptionId}/resourceGroups/${config.provider.resourceGroup}` +
    `/providers/Microsoft.Web/sites/${app.name}/config/appsettings?api-version=2016-08-01`;


  const appSettings = {
    setting1: "value1",
    setting2: "value2",
  }

  let axiosMock: MockAdapter;

  beforeEach(() => {
    axiosMock = new MockAdapter(axios);

    // Master Key
    axiosMock.onGet(masterKeyUrl).reply(200, { value: masterKey });
    // Auth Key
    axiosMock.onGet(authKeyUrl).reply(200, authKey);
    // Sync Triggers
    axiosMock.onPost(syncTriggersUrl).reply(200, syncTriggersMessage);
    // Update app settings
    axiosMock.onPut(appSettingsUrl).reply(200, appSettings)
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
    options = options || MockFactory.createTestServerlessOptions();
    return new FunctionAppService(
      sls || MockFactory.createTestServerless({
        service: slsService,
        variables: variables,
      }),
      {
        ...options,
        subscriptionId: subscriptionId
      } as any
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
    const result = await service.syncTriggers(app, {});
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

  it("list functions with retry", async () => {
    axiosMock.onGet(listFunctionsUrl).reply(200, { value: [] });
    const service = createService();

    const originalRunWithRetry = Utils.runWithRetry;
    Utils.runWithRetry = jest.fn(() => {
      return {
        data: {
          value: []
        }
      }
    }) as any;

    await service.listFunctions(app);
    const runWithRetryCalls = (Utils.runWithRetry as any).mock.calls;
    Utils.runWithRetry = originalRunWithRetry;

    expect(runWithRetryCalls).toHaveLength(1);
    const call = runWithRetryCalls[0];
    await expect(call[0]()).rejects.toThrow();
    expect(call[1]).toEqual(30);
    expect(call[2]).toEqual(30000);
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
    const settingValue = "TEST_VALUE";
    const sendApiSpy = jest.spyOn(FunctionAppService.prototype as any, "sendApiRequest")
    await service.updateFunctionAppSetting(app, settingName, settingValue);

    const expectedAppSettings = {
      ...appSettings,
      TEST_SETTING: settingValue
    }

    expect(sendApiSpy).toBeCalledWith(
      "PUT",
      appSettingsUrl,
      {
        data: {
          properties: expectedAppSettings
        }
      }
    );
  });

  it("updates an existing function app setting", async () => {
    const service = createService();
    const settingName = "setting1";
    const settingValue = "TEST_VALUE"
    const sendApiSpy = jest.spyOn(FunctionAppService.prototype as any, "sendApiRequest")

    await service.updateFunctionAppSetting(app, settingName, settingValue);

    const expectedAppSettings = {
      setting1: settingValue,
      setting2: appSettings.setting2
    }
    expect(sendApiSpy).toBeCalledWith(
      "PUT",
      appSettingsUrl,
      {
        data: {
          properties: expectedAppSettings
        }
      }
    );
  });

  describe("Updating Function App Settings", () => {

    const sasUrl = "sasUrl"

    beforeEach(() => {
      FunctionAppService.prototype.updateFunctionAppSetting = jest.fn(() => {
        return {
          properties: appSettings
        }
      }) as any;
      AzureBlobStorageService.prototype.generateBlobSasTokenUrl = jest.fn(() => Promise.resolve(sasUrl));
    });

    afterEach(() => {
      (FunctionAppService.prototype.updateFunctionAppSetting as any).mockRestore();
    });

    it("does not upload directly to function app if configured to run on linux", async () => {
      const newSlsService = MockFactory.createTestService();
      newSlsService.provider["os"] = "linux";
      const service = createService(MockFactory.createTestServerless({
        service: newSlsService,
      }));
      FunctionAppService.prototype.uploadZippedArtifactToFunctionApp = jest.fn();
      await service.uploadFunctions(app);
      expect(AzureBlobStorageService.prototype.uploadFile).toBeCalled();
      expect(AzureBlobStorageService.prototype.generateBlobSasTokenUrl).not.toBeCalled();
      expect(FunctionAppService.prototype.uploadZippedArtifactToFunctionApp).not.toBeCalled();
      (FunctionAppService.prototype.uploadZippedArtifactToFunctionApp as any).mockRestore();
    });

    it("uploads directly to function app if not configured to run from blob", async () => {
      const newSlsService = MockFactory.createTestService();
      newSlsService.provider["deployment"] = {
        external: false,
      }
      const sls = MockFactory.createTestServerless({
        service: newSlsService,
      });
      const service = createService(sls);
      FunctionAppService.prototype.uploadZippedArtifactToFunctionApp = jest.fn();
      await service.uploadFunctions(app);
      expect(AzureBlobStorageService.prototype.generateBlobSasTokenUrl).not.toBeCalled();
      expect(FunctionAppService.prototype.uploadZippedArtifactToFunctionApp).toBeCalled();
      (FunctionAppService.prototype.uploadZippedArtifactToFunctionApp as any).mockRestore();
    });

    it("does not generate SAS URL or update WEBSITE_RUN_FROM_PACKAGE if not configured to run from blob", async() => {
      const service = createService();
      await service.uploadFunctions(app);
      expect(AzureBlobStorageService.prototype.generateBlobSasTokenUrl).not.toBeCalled();
      expect(FunctionAppService.prototype.updateFunctionAppSetting).not.toBeCalled();
    });
  });
});
