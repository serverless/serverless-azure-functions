import AzureIndex from "./index";
import { MockFactory } from "./test/mockFactory"
import { AzureInvokePlugin } from "./plugins/invoke/azureInvokePlugin";
import { AzureRemovePlugin } from "./plugins/remove/azureRemovePlugin";
import { AzurePackagePlugin } from "./plugins/package/azurePackagePlugin";
import { AzureDeployPlugin } from "./plugins/deploy/azureDeployPlugin";
import { AzureLoginPlugin } from "./plugins/login/azureLoginPlugin";
import { AzureApimServicePlugin } from "./plugins/apim/azureApimServicePlugin";
import AzureProvider from "./provider/azureProvider";
import { AzureFuncPlugin } from "./plugins/func/azureFuncPlugin";
import { AzureOfflinePlugin } from "./plugins/offline/azureOfflinePlugin";
import { AzureRollbackPlugin } from "./plugins/rollback/azureRollbackPlugin";

jest.genMockFromModule("./services/baseService");
jest.mock("./services/baseService")
import { BaseService } from "./services/baseService";

describe("Azure Index", () => {
  it("contains all registered plugins", () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    new AzureIndex(sls, options);
    sls.setProvider = jest.fn();

    expect(sls.setProvider).toBeCalledWith("azure", new AzureProvider(sls));

    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzurePackagePlugin);
    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzureInvokePlugin);
    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzureRemovePlugin);
    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzureLoginPlugin);
    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzureDeployPlugin);
    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzureApimServicePlugin);
    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzureFuncPlugin);
    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzureOfflinePlugin);
    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzureRollbackPlugin);
  });

  it("does not initialize BaseService in constructor of any plugin", () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    new AzureIndex(sls, options);
    sls.setProvider = jest.fn();

    const calls = (sls.pluginManager.addPlugin as any).mock.calls;

    for (const call of calls) {
      const pluginClass = call[0];
      new pluginClass(MockFactory.createTestServerless(), MockFactory.createTestServerlessOptions());
    }
    expect(BaseService).not.toBeCalled();
  });
});
