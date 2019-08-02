import Serverless from "serverless";
import _ from "lodash";
import { MockFactory } from "../test/mockFactory";
import { ApimService } from "./apimService";
import { interpolateJson } from "../test/utils";
import axios from "axios";
import { Api, Backend, Property, ApiOperation, ApiOperationPolicy, ApiManagementService, ApiPolicy } from "@azure/arm-apimanagement";
import apimGetService404 from "../test/responses/apim-get-service-404.json";
import apimGetService200 from "../test/responses/apim-get-service-200.json";
import apimGetApi200 from "../test/responses/apim-get-api-200.json";
import apimGetApi404 from "../test/responses/apim-get-api-404.json";
import { FunctionAppService } from "./functionAppService";
import { Site } from "@azure/arm-appservice/esm/models";
import {
  PropertyContract, BackendContract, BackendCreateOrUpdateResponse,
  ApiCreateOrUpdateResponse, PropertyCreateOrUpdateResponse, ApiContract,
  ApiOperationCreateOrUpdateResponse, ApiManagementServiceResource, ApiGetResponse,
  ApiManagementServiceGetResponse,
  OperationContract,
  ApiPolicyCreateOrUpdateResponse,
} from "@azure/arm-apimanagement/esm/models";
import { AzureNamingService } from "./namingService";

describe("APIM Service", () => {
  const apimConfig = MockFactory.createTestApimConfig();
  let serverless: Serverless;

  beforeEach(() => {
    const slsConfig: any = {
      ...MockFactory.createTestService(MockFactory.createTestSlsFunctionConfig()),
      service: "test-sls",
      provider: {
        name: "azure",
        resourceGroup: "test-sls-rg",
        region: "West US",
        apim: apimConfig,
      },
    };

    serverless = MockFactory.createTestServerless({
      service: slsConfig
    });

    serverless.variables = {
      ...serverless.variables,
      azureCredentials: MockFactory.createTestAzureCredentials(),
      subscriptionId: "ABC123",
    };
  });
  it("is defined", () => {
    expect(ApimService).toBeDefined();
  });

  it("can be instantiated", () => {
    const service = new ApimService(serverless);
    expect(service).not.toBeNull();
  });

  it("when generated, has a shorted region name in the resource name", () => {
    // if APIM name is ommited, it should auto-generate one that contains a shortened region name
    const apimConfigName = MockFactory.createTestApimConfig(true);
    (serverless.service.provider as any).apim = apimConfigName;

    const service = new ApimService(serverless);
    const expectedRegionName = AzureNamingService.createShortAzureRegionName(service.getRegion());
    expect(apimConfigName.name.includes(expectedRegionName)).toBeTruthy();
  });

  describe("Get service reference", () => {
    it("returns null when service doesn't exist", async () => {
      axios.request = jest.fn((requestConfig) => MockFactory.createTestAxiosResponse(requestConfig, apimGetService404, 404));

      const service = new ApimService(serverless);
      const resource = await service.get();

      expect(resource).toBeNull();
    });

    it("returns null when APIM is not configured", async () => {
      serverless.service.provider["apim"] = null;

      const service = new ApimService(serverless);
      const resource = await service.get();

      expect(resource).toBeNull();
    });

    it("returns instance of service resource", async () => {
      const expectedResponse = interpolateJson(apimGetService200, {
        resourceGroup: {
          name: serverless.service.provider["resourceGroup"],
          location: serverless.service.provider.region,
        },
        resource: {
          name: apimConfig.name,
        },
      });

      axios.request = jest.fn((requestConfig) => MockFactory.createTestAxiosResponse(requestConfig, expectedResponse));

      const service = new ApimService(serverless);
      const resource = await service.get();

      expect(resource).not.toBeNull();
      expect(resource).toMatchObject({
        name: apimConfig.name,
        location: serverless.service.provider.region,
      });
    });
  });

  describe("Get API reference", () => {
    it("returns null when API doesn't exist", async () => {
      axios.request = jest.fn((requestConfig) => MockFactory.createTestAxiosResponse(requestConfig, apimGetApi404, 404));

      const service = new ApimService(serverless);
      const api = await service.getApi();
      expect(api).toBeNull();
    });

    it("returns null when APIM config does not exist", async () => {
      serverless.service.provider["apim"] = null;

      const service = new ApimService(serverless);
      const api = await service.getApi();

      expect(api).toBeNull();
    });

    it("returns the API reference", async () => {
      const expectedResponse = interpolateJson(apimGetApi200, {
        resourceGroup: {
          name: serverless.service.provider["resourceGroup"],
          location: serverless.service.provider.region,
        },
        service: {
          name: apimConfig.name,
        },
        resource: {
          name: apimConfig.api.name,
          displayName: apimConfig.api.displayName,
          description: apimConfig.api.description,
          path: apimConfig.api.path,
        },
      });

      axios.request = jest.fn((requestConfig) => MockFactory.createTestAxiosResponse(requestConfig, expectedResponse));

      const service = new ApimService(serverless);
      const api = await service.getApi();

      expect(api).not.toBeNull();
      expect(api).toMatchObject({
        displayName: apimConfig.api.displayName,
        description: apimConfig.api.description,
        path: apimConfig.api.path,
      });
    });
  });

  describe("Deploying API", () => {
    let backendConfig: BackendContract;
    let resourceGroupName: string;
    let appName: string;
    let serviceName: string;
    let apiName: string;
    let backendName: string;
    let functionApp: Site;
    let masterKey: string;
    let expectedApi: ApiContract;
    let expectedApiResult: ApiContract;
    let expectedBackend: BackendContract;
    let expectedProperty: PropertyContract;

    beforeEach(() => {
      backendConfig = apimConfig.backend || {} as BackendContract;
      resourceGroupName = serverless.service.provider["resourceGroup"];
      appName = serverless.service["service"];
      serviceName = apimConfig.name;
      apiName = apimConfig.api.name;
      backendName = backendConfig.name || appName;

      functionApp = {
        id: "/testapp1",
        name: "Test Site",
        location: "West US",
        defaultHostName: "testsite.azurewebsites.net",
      };
      masterKey = "ABC123";

      FunctionAppService.prototype.get = jest.fn(() => Promise.resolve(functionApp));
      FunctionAppService.prototype.getMasterKey = jest.fn(() => Promise.resolve(masterKey));

      expectedApi = {
        isCurrent: true,
        subscriptionRequired: apimConfig.api.subscriptionRequired,
        displayName: apimConfig.api.displayName,
        description: apimConfig.api.description,
        path: apimConfig.api.path,
        protocols: apimConfig.api.protocols,
      };

      expectedApiResult = {
        id: apimConfig.api.name,
        name: apimConfig.api.name,
        isCurrent: true,
        subscriptionRequired: apimConfig.api.subscriptionRequired,
        displayName: apimConfig.api.displayName,
        description: apimConfig.api.description,
        path: apimConfig.api.path,
        protocols: apimConfig.api.protocols,
      };

      expectedBackend = {
        credentials: {
          header: {
            "x-functions-key": [`{{${serverless.service["service"]}-key}}`],
          },
        },
        title: backendConfig.title || functionApp.name,
        tls: backendConfig.tls,
        proxy: backendConfig.proxy,
        description: backendConfig.description,
        protocol: backendConfig.protocol || "http",
        resourceId: `https://management.azure.com${functionApp.id}`,
        url: `https://${functionApp.defaultHostName}/api`,
      };

      expectedProperty = {
        displayName: `${serverless.service["service"]}-key`,
        secret: true,
        value: masterKey,
      };
    });

    it("ensures API, backend and keys have all been set", async () => {
      Api.prototype.createOrUpdate =
        jest.fn(() => MockFactory.createTestArmSdkResponse<ApiCreateOrUpdateResponse>(expectedApiResult, 201));
      Backend.prototype.createOrUpdate =
        jest.fn(() => MockFactory.createTestArmSdkResponse<BackendCreateOrUpdateResponse>(expectedBackend, 201));
      Property.prototype.createOrUpdate =
        jest.fn(() => MockFactory.createTestArmSdkResponse<PropertyCreateOrUpdateResponse>(expectedProperty, 201));
      ApiPolicy.prototype.createOrUpdate = jest.fn(() => Promise.resolve(null));

      const apimService = new ApimService(serverless);
      const result = await apimService.deployApi();

      expect(result).toMatchObject(expectedApiResult);
      expect(Api.prototype.createOrUpdate).toBeCalledWith(
        resourceGroupName,
        serviceName,
        apiName,
        expectedApi,
      );

      // No CORS policy by default
      expect(ApiPolicy.prototype.createOrUpdate).not.toBeCalled();

      expect(Backend.prototype.createOrUpdate).toBeCalledWith(
        resourceGroupName,
        serviceName,
        backendName,
        expectedBackend,
      );

      expect(Property.prototype.createOrUpdate).toBeCalledWith(
        resourceGroupName,
        serviceName,
        expectedProperty.displayName,
        expectedProperty,
      );
    });

    it("deploys API CORS policy when defined within configuration", async () => {
      Api.prototype.createOrUpdate =
        jest.fn(() => MockFactory.createTestArmSdkResponse<ApiCreateOrUpdateResponse>(expectedApiResult, 201));
      Backend.prototype.createOrUpdate =
        jest.fn(() => MockFactory.createTestArmSdkResponse<BackendCreateOrUpdateResponse>(expectedBackend, 201));
      Property.prototype.createOrUpdate =
        jest.fn(() => MockFactory.createTestArmSdkResponse<PropertyCreateOrUpdateResponse>(expectedProperty, 201));
      ApiPolicy.prototype.createOrUpdate =
        jest.fn(() => MockFactory.createTestArmSdkResponse<ApiPolicyCreateOrUpdateResponse>(expectedProperty, 201));

      const corsPolicy = MockFactory.createTestMockApiCorsPolicy();
      serverless.service.provider["apim"]["cors"] = corsPolicy;

      const apimService = new ApimService(serverless);
      const result = await apimService.deployApi();

      expect(result).not.toBeNull();
      expect(ApiPolicy.prototype.createOrUpdate).toBeCalledWith(
        resourceGroupName,
        serviceName,
        apiName,
        {
          format: "rawxml",
          value: expect.stringContaining("cors"),
        }
      );
    });

    it("returns null when APIM is not configured", async () => {
      serverless.service.provider["apim"] = null;

      const service = new ApimService(serverless);
      const api = await service.deployApi();

      expect(api).toBeNull();
    });

    it("fails when API deployment fails", async () => {
      const apiError = "Error creating API";
      Api.prototype.createOrUpdate = jest.fn(() => Promise.reject(apiError));

      const apimService = new ApimService(serverless);
      await expect(apimService.deployApi()).rejects.toEqual(apiError);
    });

    it("fails when Backend deployment fails", async () => {
      const apiError = "Error creating Backend";

      Api.prototype.createOrUpdate =
        jest.fn(() => MockFactory.createTestArmSdkResponse<ApiCreateOrUpdateResponse>(expectedApiResult, 201));
      Backend.prototype.createOrUpdate = jest.fn(() => Promise.reject(apiError));

      const apimService = new ApimService(serverless);
      await expect(apimService.deployApi()).rejects.toEqual(apiError);
    });

    it("fails when Property deployment fails", async () => {
      const apiError = "Error creating Property";

      Api.prototype.createOrUpdate =
        jest.fn(() => MockFactory.createTestArmSdkResponse<ApiCreateOrUpdateResponse>(expectedApiResult, 201));
      Backend.prototype.createOrUpdate =
        jest.fn(() => MockFactory.createTestArmSdkResponse<BackendCreateOrUpdateResponse>(expectedBackend, 201));
      Property.prototype.createOrUpdate = jest.fn(() => Promise.reject(apiError));

      const apimService = new ApimService(serverless);
      await expect(apimService.deployApi()).rejects.toEqual(apiError);
    });
  });

  describe("Deploying Functions", () => {
    it("performs a noop when APIM config has not been configured", async () => {
      serverless.service.provider["apim"] = null;

      const apimService = new ApimService(serverless);
      const deploySpy = jest.spyOn(apimService, "deployFunction");

      const serviceResource: ApiManagementServiceResource = MockFactory.createTestApimService();
      const api: ApiContract = MockFactory.createTestApimApi();

      await apimService.deployFunctions(serviceResource, api);

      expect(deploySpy).not.toBeCalled();
    });

    it("ensures all serverless functions have been deployed into specified API", async () => {
      const slsFunctions = _.values(serverless.service["functions"]);

      const apimResource: ApiManagementServiceResource = {
        name: apimConfig.name,
        location: "West US",
        publisherEmail: "someone@example.com",
        publisherName: "Someone",
        sku: {
          capacity: 1,
          name: "Consumption",
        },
      };

      const apiContract = apimConfig.api;
      ApiManagementService.prototype.get = jest.fn(() => MockFactory.createTestArmSdkResponse<ApiManagementServiceGetResponse>(apimResource, 200));
      Api.prototype.get = jest.fn(() => MockFactory.createTestArmSdkResponse<ApiGetResponse>(apiContract, 200));

      ApiOperation.prototype.createOrUpdate =
        jest.fn((resourceGroup, serviceName, apiName, operationName, operationContract) => {
          const response = MockFactory.createTestArmSdkResponse<ApiOperationCreateOrUpdateResponse>(operationContract, 201);
          return Promise.resolve(response);
        });

      ApiOperationPolicy.prototype.createOrUpdate = jest.fn(() => Promise.resolve(null));

      const deployFunctionSpy = jest.spyOn(ApimService.prototype, "deployFunction");

      const service = new ApimService(serverless);
      const apimInstance = await service.get();
      const api = await service.getApi();

      await service.deployFunctions(apimInstance, api);

      expect(deployFunctionSpy).toBeCalledTimes(slsFunctions.length);

      const createOperationCall = ApiOperation.prototype.createOrUpdate as jest.Mock;
      createOperationCall.mock.calls.forEach((args, index) => {
        const expected = slsFunctions[index].apim.operations[0] as OperationContract;
        const actual = args[4] as OperationContract;

        expect(actual).toMatchObject({
          displayName: expected.displayName,
          description: expected.description || "",
          method: expected.method,
          urlTemplate: expected.urlTemplate,
          templateParameters: expected.templateParameters || [],
          responses: expected.responses || [],
        });
      });
    });
  });
});
