import { Site } from "@azure/arm-appservice/esm/models";
import Serverless from "serverless";
import { ServerlessAzureOptions, ServerlessAzureConfig } from "../../models/serverless";
import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureDeployPlugin } from "./azureDeployPlugin";
import  {vol} from "memfs"
import fs from "fs"

jest.mock("../../services/functionAppService");
import { FunctionAppService } from "../../services/functionAppService";

jest.mock("../../services/resourceService");
import { ResourceService } from "../../services/resourceService";
import { ApimService } from "../../services/apimService";

describe("Deploy plugin", () => {
  let sls: Serverless;
  let options: ServerlessAzureOptions;
  let plugin: AzureDeployPlugin;

  beforeAll(() => {
    vol.fromNestedJSON({
      "serviceName.zip": "contents",
    }, process.cwd());
  });

  beforeEach(() => {
    FunctionAppService.prototype.getFunctionZipFile = jest.fn(() => "serviceName.zip");
    ApimService.prototype.deploy = jest.fn();

    sls = MockFactory.createTestServerless();
    options = MockFactory.createTestServerlessOptions();

    plugin = new AzureDeployPlugin(sls, options);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    vol.reset();
  })

  it("calls deploy", async () => {
    const existsSpy = jest.spyOn(fs, "existsSync");
    existsSpy.mockImplementation(() => true);
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

  it("Crashes deploy if function is specified", async () => {
    plugin = new AzureDeployPlugin(sls, { function: "myFunction" } as any);
    await expect(invokeHook(plugin, "deploy:deploy"))
      .rejects.toThrow("The Azure Functions plugin does not currently support deployments of individual functions. " +
        "Azure Functions are zipped up as a package and deployed together as a unit");
  });

  it("lists deployments from sub-command", async () => {
    const deploymentString = "deployments";
    ResourceService.prototype.listDeployments = jest.fn(() => Promise.resolve(deploymentString));
    await invokeHook(plugin, "deploy:list:list");
    expect(ResourceService.prototype.listDeployments).toBeCalled();
    expect(sls.cli.log).lastCalledWith(deploymentString);
  });

  it("deploys APIM from sub-command if configured", async () => {
    (sls.service as any as ServerlessAzureConfig).provider.apim = {} as any;
    plugin = new AzureDeployPlugin(sls, {} as any);
    await invokeHook(plugin, "deploy:apim:apim");
    expect(ApimService.prototype.deploy).toBeCalled();
  });

  it("skips deployment of APIM from sub-command if not configured", async () => {
    delete (sls.service as any as ServerlessAzureConfig).provider.apim;
    plugin = new AzureDeployPlugin(sls, {} as any);
    await invokeHook(plugin, "deploy:apim:apim");
    expect(ApimService.prototype.deploy).not.toBeCalled();
  });

  it("crashes deploy list if function is specified", async () => {
    plugin = new AzureDeployPlugin(sls, { function: "myFunction" } as any);
    await expect(invokeHook(plugin, "deploy:list:list"))
      .rejects.toThrow("The Azure Functions plugin does not currently support deployments of individual functions. " +
        "Azure Functions are zipped up as a package and deployed together as a unit");
  });

  it("crashes deploy if zip file is not found", async () => {
    const existsSpy = jest.spyOn(fs, "existsSync");
    existsSpy.mockImplementation(() => true);
    FunctionAppService.prototype.getFunctionZipFile = jest.fn(() => "notExisting.zip");
    await expect(invokeHook(plugin, "deploy:deploy"))
      .resolves.toThrow(/Function app zip file '.*' does not exist/)
  });
});
