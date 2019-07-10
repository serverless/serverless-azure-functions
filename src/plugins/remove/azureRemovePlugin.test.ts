import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureRemovePlugin } from "./azureRemovePlugin";

jest.mock("../../services/resourceService");
import { ResourceService } from "../../services/resourceService";

describe("Remove Plugin", () => {
  it("calls remove hook", async () => {
    const deleteDeployment = jest.fn();
    const deleteResourceGroup = jest.fn();

    ResourceService.prototype.deleteDeployment = deleteDeployment;
    ResourceService.prototype.deleteResourceGroup = deleteResourceGroup;

    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureRemovePlugin(sls, options);

    await invokeHook(plugin, "remove:remove");

    expect(deleteDeployment).toBeCalled();
    expect(deleteResourceGroup).toBeCalled();
    expect(sls.cli.log).toBeCalledWith("Service successfully removed");
  });
});
