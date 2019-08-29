import AzureIndex from "./index";
import { MockFactory } from "./test/mockFactory"
import { AzureInvokePlugin } from "./plugins/invoke/azureInvokePlugin";
import { AzureRemovePlugin } from "./plugins/remove/azureRemovePlugin";
import { AzurePackagePlugin } from "./plugins/package/azurePackagePlugin";
import { AzureDeployPlugin } from "./plugins/deploy/azureDeployPlugin";
import { AzureLoginPlugin } from "./plugins/login/azureLoginPlugin";
import { AzureApimServicePlugin } from "./plugins/apim/azureApimServicePlugin";
import { AzureApimFunctionPlugin } from "./plugins/apim/azureApimFunctionPlugin";
import AzureProvider from "./provider/azureProvider";

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
    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzureApimFunctionPlugin);
  });
});
