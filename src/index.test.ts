import AzureIndex from "./index";
import { MockFactory } from "./test/mockFactory"
import { AzureInvoke } from "./plugins/invoke/azureInvoke";
import { AzureLogs } from "./plugins/logs/azureLogs";
import { AzureRemove } from "./plugins/remove/azureRemove";
import { AzurePackage } from "./plugins/package/azurePackage";
import { AzureDeployPlugin } from "./plugins/deploy/azureDeployPlugin";
import { AzureLoginPlugin } from "./plugins/login/loginPlugin";
import { AzureApimServicePlugin } from "./plugins/apim/apimServicePlugin";
import { AzureApimFunctionPlugin } from "./plugins/apim/apimFunctionPlugin";
import AzureProvider from "./provider/azureProvider";

describe("Azure Index", () => {
  it("contains all registered plugins", () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    new AzureIndex(sls, options);
    sls.setProvider = jest.fn();

    expect(sls.setProvider).toBeCalledWith("azure", new AzureProvider(sls));

    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzurePackage);
    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzureInvoke);
    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzureLogs);
    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzureRemove);
    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzureLoginPlugin);
    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzureDeployPlugin);
    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzureApimServicePlugin);
    expect(sls.pluginManager.addPlugin).toBeCalledWith(AzureApimFunctionPlugin);
  });
});