import MockAdapter from "axios-mock-adapter";
import mockFs from "mock-fs";
import Serverless from "serverless";
import { ServerlessAzureConfig } from "../models/serverless";
import { MockFactory } from "../test/mockFactory";
import { PublishService } from "./publishService";

jest.mock("./coreToolsService");
import { CoreToolsService } from "./coreToolsService";

jest.mock("./functionAppService");
import { FunctionAppService } from "./functionAppService";

describe("Publish Service", () => {

  const app = MockFactory.createTestSite();
  const functionAppFileName = "functionApp.zip";
  const baseUrl = "https://management.azure.com"
  const slsService = MockFactory.createTestService();
  const config: ServerlessAzureConfig = slsService as any;
  const subscriptionId = "subId";
  
  let axiosMock: MockAdapter;

  const syncTriggersUrl = `${baseUrl}/subscriptions/${subscriptionId}` +
    `/resourceGroups/${config.provider.resourceGroup}/providers/Microsoft.Web/sites/${app.name}` +
    "/syncfunctiontriggers?api-version=2016-08-01";
  const syncTriggersResponse = "sync triggers success";

  function createService(sls?: Serverless, options?: Serverless.Options) {
    return new PublishService(
      sls || MockFactory.createTestServerless(),
      options || {} as any
    )
  }

  beforeEach(() => {
    const fsConfig = {}
    fsConfig[functionAppFileName] = "";
    mockFs(fsConfig);
    
    // Sync Triggers
    axiosMock.onPost(syncTriggersUrl).reply(200, syncTriggersResponse);
  });

  afterEach(() => {
    mockFs.restore();
  })

  xit("calls core tools for linux publishing", async () => {

  });

  xit("does not call core tools for windows publishing", async () => {
    const newSlsService = MockFactory.createTestService();
    newSlsService.provider["os"] = "windows";
    const service = createService(MockFactory.createTestServerless({
      service: newSlsService,
    }));

    await service.publish(app, functionAppFileName);
   
    expect(CoreToolsService.publish).not.toBeCalled();
    // FunctionAppService.prototype.uploadZippedArtifactToFunctionApp = jest.fn();
    // await service.uploadFunctions(app);
    // expect(AzureBlobStorageService.prototype.uploadFile).toBeCalled();
    // expect(AzureBlobStorageService.prototype.generateBlobSasTokenUrl).not.toBeCalled();
    // expect(FunctionAppService.prototype.uploadZippedArtifactToFunctionApp).not.toBeCalled();
    // (FunctionAppService.prototype.uploadZippedArtifactToFunctionApp as any).mockRestore();
  });
});