import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureDeployPlugin } from "./azureDeployPlugin";

jest.mock("../../services/functionAppService");
import { FunctionAppService } from "../../services/functionAppService";

jest.mock("../../services/resourceService");
import { ResourceService } from "../../services/resourceService";
import { Site } from "@azure/arm-appservice/esm/models";
import { ServerlessAzureOptions } from "../../models/serverless";
import Serverless from "serverless";

describe("Deploy plugin", () => {
  let sls: Serverless;
  let options: ServerlessAzureOptions;
  let plugin: AzureDeployPlugin;

  beforeEach(() => {
    jest.resetAllMocks();
    sls = MockFactory.createTestServerless();
    options = MockFactory.createTestServerlessOptions();

    plugin = new AzureDeployPlugin(sls, options);
  });

  afterEach(() => {
    jest.resetAllMocks();
  })

  it("calls deploy hook", async () => {
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

  it("lists deployments with timestamps", async () => {
    const deployments = MockFactory.createTestDeployments(5, true);
    ResourceService.prototype.getDeployments = jest.fn(() => Promise.resolve(deployments));

    await invokeHook(plugin, "deploy:list:list");
    expect(ResourceService.prototype.getDeployments).toBeCalled();

    let expectedLogStatement = "\n\nDeployments";
    const originalTimestamp = +MockFactory.createTestTimestamp();
    let i = 0
    for (const dep of deployments) {
      const timestamp = originalTimestamp + i
      expectedLogStatement += "\n-----------\n"
      expectedLogStatement += `Name: ${dep.name}\n`
      expectedLogStatement += `Timestamp: ${timestamp}\n`;
      expectedLogStatement += `Datetime: ${new Date(timestamp).toISOString()}\n`
      i++
    }
    expectedLogStatement += "-----------\n"
    expect(sls.cli.log).lastCalledWith(expectedLogStatement);
  });

  it("lists deployments without timestamps", async () => {
    const deployments = MockFactory.createTestDeployments();
    ResourceService.prototype.getDeployments = jest.fn(() => Promise.resolve(deployments));

    await invokeHook(plugin, "deploy:list:list");
    expect(ResourceService.prototype.getDeployments).toBeCalled();

    let expectedLogStatement = "\n\nDeployments";
    for (const dep of deployments) {
      expectedLogStatement += "\n-----------\n"
      expectedLogStatement += `Name: ${dep.name}\n`
      expectedLogStatement += "Timestamp: None\n";
      expectedLogStatement += "Datetime: None\n"
    }
    expectedLogStatement += "-----------\n"
    expect(sls.cli.log).lastCalledWith(expectedLogStatement);
  });

  it("logs empty deployment list", async () => {
    const resourceGroup = "rg1";
    ResourceService.prototype.getDeployments = jest.fn(() => Promise.resolve([])) as any;
    ResourceService.prototype.getResourceGroupName = jest.fn(() => resourceGroup);

    await invokeHook(plugin, "deploy:list:list");
    expect(ResourceService.prototype.getDeployments).toBeCalled();

    expect(sls.cli.log).lastCalledWith(`No deployments found for resource group '${resourceGroup}'`);
  });
});
