import mockFs from "mock-fs";
import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { CoreToolsService } from "./coreToolsService";
import { FunctionAppService } from "./functionAppService";
import { PublishService } from "./publishService";

jest.mock("./coreToolsService");

jest.mock("./functionAppService");

describe("Publish Service", () => {

  const app = MockFactory.createTestSite();
  const functionAppFileName = "app.zip";
  const slsService = MockFactory.createTestService();
  const variables = MockFactory.createTestVariables();
  const functionNames = [ "hello", "goodbye" ]
  
  function createService(sls?: Serverless, options?: Serverless.Options) {
    sls = sls || MockFactory.createTestServerless();
    options = options || {} as any;
    return new PublishService(sls, options, new FunctionAppService(sls, options));
  }

  beforeEach(() => {
    const fsConfig = {}
    fsConfig[functionAppFileName] = "";
    mockFs(fsConfig);

    FunctionAppService.prototype.listFunctions = jest.fn(() => Promise.resolve(
      ["hello", "goodbye"]
        .map((name) => { 
          return { name }
        })
    )) as any;
    
    (PublishService.prototype as any).sendFile = jest.fn();
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("calls core tools for linux publishing", async () => {
    const sls = MockFactory.createTestServerless();
    sls.service.provider["os"] = "linux";
    const service = createService(sls);
    await service.publish(app, functionAppFileName);
    expect(CoreToolsService.publish).toBeCalled();
    expect((PublishService.prototype as any).sendFile).not.toBeCalled();
    (CoreToolsService.publish as any).mockRestore();
    (PublishService.prototype as any).sendFile.mockRestore();
  });

  it("does not call core tools for windows publishing", async () => {
    const sls = MockFactory.createTestServerless();
    sls.service.provider["os"] = "windows";
    const service = createService(sls);
    await service.publish(app, functionAppFileName);
    expect(CoreToolsService.publish).not.toBeCalled();
    const scmDomain = app.enabledHostNames.find((hostname) => hostname.endsWith("scm.azurewebsites.net"));
    const expectedUploadUrl = `https://${scmDomain}/api/zipdeploy/`;
    expect((PublishService.prototype as any).sendFile).toBeCalledWith({
      method: "POST",
      uri: expectedUploadUrl,
      json: true,
      headers: {
        Authorization: `Bearer ${(await variables["azureCredentials"].getToken()).accessToken}`,
        Accept: "*/*",
        ContentType: "application/octet-stream",
      }
    }, slsService["artifact"]);
    (CoreToolsService.publish as any).mockRestore();
    (PublishService.prototype as any).sendFile.mockRestore();
    expect(sls.service.getAllFunctions).toBeCalled();
    expect(FunctionAppService.prototype.listFunctions).toBeCalledWith(app);
    expect(FunctionAppService.prototype.getFunctionHttpTriggerConfig).toBeCalledTimes(functionNames.length);
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
    await service.publish(customApp, functionAppFileName);

    expect((PublishService.prototype as any).sendFile).toBeCalledWith({
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
});