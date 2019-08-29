import Serverless from "serverless";
import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureKeyVaultPlugin } from "./azureKeyVaultPlugin";

jest.mock("../../services/azureKeyVaultService.ts");
import { AzureKeyVaultService } from "../../services/azureKeyVaultService";

describe("Azure Key Vault Plugin", () => {
  it("is defined", () => {
    expect(AzureKeyVaultPlugin).toBeDefined();
  });

  it("can be instantiated", () => {
    const serverless = new Serverless();
    const options: Serverless.Options = {
      stage: "",
      region: "",
    }
    const plugin = new AzureKeyVaultPlugin(serverless, options);

    expect(plugin).not.toBeNull();
  });

  it("calls set policy when key vault specified", async () => {
    const setPolicy = jest.fn();

    AzureKeyVaultService.prototype.setPolicy = setPolicy;

    const sls = MockFactory.createTestServerless();
    sls.service.provider["keyVault"] = { name: "testVault", resourceGroup: "testGroup"}
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureKeyVaultPlugin(sls, options);

    await invokeHook(plugin, "after:deploy:deploy");

    expect(sls.cli.log).toBeCalledWith("Starting KeyVault service setup")
    expect(setPolicy).toBeCalled();
    expect(sls.cli.log).lastCalledWith("Finished KeyVault service setup")
  });

  it("does not call deploy API or deploy functions when \"keyVault\" not included in config", async () => {
    const setPolicy = jest.fn();

    AzureKeyVaultService.prototype.setPolicy = setPolicy;

    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureKeyVaultPlugin(sls, options);

    await invokeHook(plugin, "after:deploy:deploy");

    expect(sls.cli.log).not.toBeCalled()
    expect(setPolicy).not.toBeCalled();
  });
});
