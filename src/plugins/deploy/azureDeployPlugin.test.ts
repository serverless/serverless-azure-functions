import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureDeployPlugin } from "./azureDeployPlugin";

jest.mock("../../services/functionAppService");
import { FunctionAppService } from "../../services/functionAppService";

jest.mock("../../services/resourceService");
import { ResourceService } from "../../services/resourceService";
import { Site } from "@azure/arm-appservice/esm/models";

describe("Deploy plugin", () => {

  it("calls deploy hook", async () => {
    const deployResourceGroup = jest.fn();
    const functionAppStub: Site = MockFactory.createTestSite();
    const deploy = jest.fn(() => Promise.resolve(functionAppStub));
    const uploadFunctions = jest.fn();

    ResourceService.prototype.deployResourceGroup = deployResourceGroup;
    FunctionAppService.prototype.deploy = deploy;
    FunctionAppService.prototype.uploadFunctions = uploadFunctions;

    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureDeployPlugin(sls, options);

    await invokeHook(plugin, "deploy:deploy");

    expect(deployResourceGroup).toBeCalled();
    expect(deploy).toBeCalled();
    expect(uploadFunctions).toBeCalledWith(functionAppStub);
  });

  it("lists deployments", async () => {
    const deployments = MockFactory.createTestDeployments();
    ResourceService.prototype.getDeployments = jest.fn(() => Promise.resolve(deployments));
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureDeployPlugin(sls, options);
    await invokeHook(plugin, "deploy:list:list");
    let expectedLogStatement = "\n\nDeployments";
    for (const dep of deployments) {
      expectedLogStatement += "\n-----------\n"
      expectedLogStatement += `Name: ${dep.name}\n`
      expectedLogStatement += `Timestamp: ${dep.properties.timestamp.getTime()}\n`;
      expectedLogStatement += `Datetime: ${dep.properties.timestamp.toISOString()}\n`
    }
    expectedLogStatement += "-----------\n"
    expect(sls.cli.log).lastCalledWith(expectedLogStatement);
  });
});
