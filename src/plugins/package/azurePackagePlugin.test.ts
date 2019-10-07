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
    const options = MockFactory.createTestServerlessOptions();

    plugin = new AzurePackagePlugin(sls, options);
  });

  it("sets creates function bindings before package:setupProviderConfiguration life cycle event", async () => {
    await invokeHook(plugin, "before:package:setupProviderConfiguration");
    expect(PackageService.prototype.createBindings).toBeCalled();
    expect(PackageService.prototype.cleanUpServerlessDir).toBeCalled();
  });

  it("prepares the package for webpack before webpack:package:packageModules life cycle event", async () => {
    await invokeHook(plugin, "before:webpack:package:packageModules");
    expect(PackageService.prototype.createBindings).toBeCalled();
    expect(PackageService.prototype.cleanUpServerlessDir).toBeCalled();
    expect(PackageService.prototype.prepareWebpack).toBeCalled();
  });

  it("only calls create bindings 1 time throughout full package life cycle", async () => {
    await invokeHook(plugin, "before:package:setupProviderConfiguration");
    await invokeHook(plugin, "before:webpack:package:packageModules");

    expect(PackageService.prototype.createBindings).toBeCalledTimes(1);
    expect(PackageService.prototype.prepareWebpack).toBeCalledTimes(1);
    expect(PackageService.prototype.cleanUpServerlessDir).toBeCalledTimes(1);
  });

  it("cleans up package after package:finalize", async () => {
    await invokeHook(plugin, "after:package:finalize");
    expect(PackageService.prototype.cleanUp).toBeCalled();
  });

  it("Throws an error of package.individually is specified", async () => {
    const slsService = MockFactory.createTestService();
    slsService["package"] = { individually: true };
    sls = MockFactory.createTestServerless({ service: slsService });
    plugin = new AzurePackagePlugin(sls, MockFactory.createTestServerlessOptions());
    await expect(invokeHook(plugin, "before:package:setupProviderConfiguration")).rejects.toThrow(
      "Cannot package Azure Functions individually. " +
      "Remove `individually` attribute from the `package` section of the serverless config"
    );
  });

  describe("Package specified in options", () => {

    beforeEach(() => {
      plugin = new AzurePackagePlugin(sls, MockFactory.createTestServerlessOptions({
        package: "fake.zip",
      }));
    });

    it("does not call create bindings if package specified in options", async () => {
      await invokeHook(plugin, "before:package:setupProviderConfiguration");
      expect(PackageService.prototype.createBindings).not.toBeCalled();
      expect(sls.cli.log).lastCalledWith("Deploying pre-built package. No need to create bindings");
    });

    it("does not call webpack if package specified in options", async () => {
      await invokeHook(plugin, "before:webpack:package:packageModules");
      expect(PackageService.prototype.createBindings).not.toBeCalled();
      expect(PackageService.prototype.prepareWebpack).not.toBeCalled();
      expect(PackageService.prototype.cleanUpServerlessDir).not.toBeCalled();

      expect(sls.cli.log).lastCalledWith("No need to perform webpack. Using pre-existing package");
    });

    it("does not call finalize if package specified in options", async () => {
      await invokeHook(plugin, "after:package:finalize");
      expect(PackageService.prototype.cleanUp).not.toBeCalled();
      expect(PackageService.prototype.cleanUpServerlessDir).not.toBeCalled();
      expect(sls.cli.log).lastCalledWith("No need to clean up generated folders & files. Using pre-existing package");
    });
  });

  describe("Linux", () => {
    let pythonPlugin: AzurePackagePlugin;
    const artifactHook = "package:createDeploymentArtifacts";

    beforeEach(() => {
      const sls = MockFactory.createTestServerless();
      sls.service.provider["os"] = "linux";
      pythonPlugin = new AzurePackagePlugin(sls, {} as any);
      PackageService.prototype.createPackage = jest.fn();
    });

    it("replaces existing hook for creating artifact if python runtime", async () => {
      expect(pythonPlugin.hooks[artifactHook]).toBeTruthy();
      await invokeHook(pythonPlugin, "package:createDeploymentArtifacts");
      expect(PackageService.prototype.createPackage).toBeCalled();
    });

    it("does not replace existing hook if node runtime", async () => {
      const defaultPlugin = new AzurePackagePlugin(MockFactory.createTestServerless(), {} as any);
      expect(defaultPlugin.hooks[artifactHook]).toBeFalsy();
    })
  });
});
