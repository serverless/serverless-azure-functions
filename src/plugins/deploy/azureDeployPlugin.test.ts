import { Site } from "@azure/arm-appservice/esm/models";
import Serverless from "serverless";
import { ServerlessAzureOptions } from "../../models/serverless";
import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureDeployPlugin } from "./azureDeployPlugin";
import mockFs  from "mock-fs"

jest.mock("../../services/functionAppService");
import { FunctionAppService } from "../../services/functionAppService";

jest.mock("../../services/resourceService");
import { ResourceService } from "../../services/resourceService";

describe("Deploy plugin", () => {
  let sls: Serverless;
  let options: ServerlessAzureOptions;
  let plugin: AzureDeployPlugin;

  beforeAll(() => {
    mockFs({
      "serviceName.zip": "contents",
    }, { createCwd: true, createTmp: true });
  });

  beforeEach(() => {
    FunctionAppService.prototype.getFunctionZipFile = jest.fn(() => "serviceName.zip");

    sls = MockFactory.createTestServerless();
    options = MockFactory.createTestServerlessOptions();

    plugin = new AzureDeployPlugin(sls, options);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    mockFs.restore();
  })

  it("calls deploy", async () => {
    const deployResourceGroup = jest.fn();
    const functionAppStub: Site = MockFactory.createTestSite();
    const deploy = jest.fn(() => Promise.resolve(functionAppStub));
    const uploadFunctions = jest.fn();

    ResourceService.prototype.deployResourceGroup = deployResourceGroup;
    FunctionAppService.prototype.deploy = deploy;
    FunctionAppService.prototype.uploadFunctions = uploadFunctions;

    await invokeHook(plugin, "deploy:deploy");

    expect(deployResourceGroup).toBeCalled();
    expect(deploy).toBeCalled();
    expect(uploadFunctions).toBeCalledWith(functionAppStub);
  });

  it("lists deployments", async () => {
    const deploymentString = "deployments";
    ResourceService.prototype.listDeployments = jest.fn(() => Promise.resolve(deploymentString));
    await invokeHook(plugin, "deploy:list:list");
    expect(ResourceService.prototype.listDeployments).toBeCalled();
    expect(sls.cli.log).lastCalledWith(deploymentString);
  });
});
