import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureRemovePlugin } from "./azureRemovePlugin";
import { Utils } from "../../shared/utils";

jest.mock("../../services/resourceService");
import { ResourceService } from "../../services/resourceService";

describe("Remove Plugin", () => {

  const resourceGroupName = "resource-group"

  beforeEach(() => {
    ResourceService.prototype.deleteDeployment = jest.fn();
    ResourceService.prototype.deleteResourceGroup = jest.fn();
    ResourceService.prototype.getResourceGroupName = jest.fn(() => resourceGroupName);
    ResourceService.prototype.getResourceGroup = jest.fn(() => Promise.resolve(resourceGroupName)) as any;
    Utils.waitForUserInput = jest.fn(() => Promise.resolve(resourceGroupName));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("deletes resource group", async () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureRemovePlugin(sls, options);

    await invokeHook(plugin, "remove:remove");

    expect(ResourceService.prototype.deleteDeployment).toBeCalled();
    expect(ResourceService.prototype.deleteResourceGroup).toBeCalled();
  });

  it("does not delete resource group if it doesn't exist in Azure", async () => {
    ResourceService.prototype.getResourceGroup = jest.fn(() => undefined);
    
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureRemovePlugin(sls, options);

    await invokeHook(plugin, "remove:remove");

    expect(ResourceService.prototype.deleteDeployment).not.toBeCalled();
    expect(ResourceService.prototype.deleteResourceGroup).not.toBeCalled();
    expect(sls.cli.log).lastCalledWith(`Resource group "${resourceGroupName}" does not exist in your Azure subscription`);
  });

  it("does not delete resource group if user input does not match resource group", async () => {
    Utils.waitForUserInput = jest.fn(() => Promise.resolve("not-my-resource-group"));
    
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureRemovePlugin(sls, options);

    await invokeHook(plugin, "remove:remove");

    expect(ResourceService.prototype.deleteDeployment).not.toBeCalled();
    expect(ResourceService.prototype.deleteResourceGroup).not.toBeCalled();
  });
});
