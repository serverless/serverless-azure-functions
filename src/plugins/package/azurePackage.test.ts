import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzurePackage } from "./azurePackage";
import { PackageService } from "../../services/packageService";

describe("Azure Package Plugin", () => {
  it("sets up provider configuration", async () => {
    const slsFunctionConfig = MockFactory.createTestSlsFunctionConfig();
    const sls = MockFactory.createTestServerless();

    PackageService.prototype.createBindings = jest.fn(() => Promise.resolve([]));

    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzurePackage(sls, options);
    await invokeHook(plugin, "before:package:setupProviderConfiguration");

    expect(PackageService.prototype.createBindings).toBeCalled();
  });

});
