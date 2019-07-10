import Serverless from "serverless";
import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzurePackagePlugin } from "./azurePackagePlugin";
jest.mock("../../services/packageService");
import { PackageService } from "../../services/packageService";

describe("Azure Package Plugin", () => {
  let sls: Serverless;
  let plugin: AzurePackagePlugin;

  beforeEach(() => {
    jest.resetAllMocks();
    sls = MockFactory.createTestServerless();

    plugin = new AzurePackagePlugin(sls);
  });

  it("sets creates function bindings before package:setupProviderConfiguration life cycle event", async () => {
    await invokeHook(plugin, "before:package:setupProviderConfiguration");
    expect(PackageService.prototype.createBindings).toBeCalled();
  });

  it("prepares the package for webpack before webpack:package:packageModules life cycle event", async () => {
    await invokeHook(plugin, "before:webpack:package:packageModules");
    expect(PackageService.prototype.createBindings).toBeCalled();
    expect(PackageService.prototype.prepareWebpack).toBeCalled();
  });

  it("only calls create bindings 1 time throughout full package life cycle", async () => {
    await invokeHook(plugin, "before:package:setupProviderConfiguration");
    await invokeHook(plugin, "before:webpack:package:packageModules");

    expect(PackageService.prototype.createBindings).toBeCalledTimes(1);
    expect(PackageService.prototype.prepareWebpack).toBeCalledTimes(1);
  });

  it("cleans up package after package:finalize", async () => {
    await invokeHook(plugin, "after:package:finalize");
    expect(PackageService.prototype.cleanUp).toBeCalled();
  })
});
