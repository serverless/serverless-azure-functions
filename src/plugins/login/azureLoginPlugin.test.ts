import Serverless from "serverless";
import { AzureLoginService } from "../../services/loginService";
import { MockFactory } from "../../test/mockFactory";
import { invokeHook, setEnvVariables, unsetEnvVariables } from "../../test/utils";
import { AzureLoginPlugin } from "./azureLoginPlugin";
import { loginHooks } from "./loginHooks";
import { ServerlessAzureConfig } from "../../models/serverless";

describe("Login Plugin", () => {

  const envVariables = MockFactory.createTestServicePrincipalEnvVariables()
  const credentials = MockFactory.createTestVariables().azureCredentials;

  function createPlugin(hasCreds = false, serverless?: Serverless, options?: Serverless.Options): AzureLoginPlugin {
    const sls = serverless || MockFactory.createTestServerless();
    if (!hasCreds) {
      delete sls.variables["azureCredentials"];
    }
    return new AzureLoginPlugin(sls, options || MockFactory.createTestServerlessOptions());
  }

  function createMockLoginFunction(authResponse?) {
    return jest.fn(() => Promise.resolve(authResponse || MockFactory.createTestAuthResponse()));
  }

  function setServicePrincipalEnvVariables() {
    setEnvVariables(envVariables);
  }

  function unsetServicePrincipalEnvVariables() {
    unsetEnvVariables(envVariables);
  }

  async function invokeLoginHook(hasCreds = false, serverless?: Serverless, options?: Serverless.Options) {
    const plugin = createPlugin(hasCreds, serverless, options);
    await invokeHook(plugin, `before:${loginHooks[0]}`);
  }

  beforeEach(() => {
    AzureLoginService.prototype.interactiveLogin = createMockLoginFunction();
    AzureLoginService.prototype.servicePrincipalLogin = createMockLoginFunction();
  });

  it("contains the hooks as contained in loginHooks", () => {
    expect(Object.keys(createPlugin().hooks)).toEqual(loginHooks.map((hook) => `before:${hook}`));
  });

  it("returns if azure credentials are set", async () => {
    await invokeLoginHook(true);
    expect(AzureLoginService.prototype.interactiveLogin).not.toBeCalled();
    expect(AzureLoginService.prototype.servicePrincipalLogin).not.toBeCalled();
  });

  it("calls login if azure credentials are not set", async () => {
    unsetServicePrincipalEnvVariables();
    await invokeLoginHook();
    expect(AzureLoginService.prototype.interactiveLogin).toBeCalled();
    expect(AzureLoginService.prototype.servicePrincipalLogin).not.toBeCalled();
  });

  it("calls service principal login if environment variables are set", async () => {
    setServicePrincipalEnvVariables();
    const sls = MockFactory.createTestServerless();
    await invokeLoginHook(false, sls);
    expect(AzureLoginService.prototype.servicePrincipalLogin).toBeCalledWith(
      "azureServicePrincipalClientId",
      "azureServicePrincipalPassword",
      "azureServicePrincipalTenantId",
      undefined // would be options
    )
    expect(AzureLoginService.prototype.interactiveLogin).not.toBeCalled();
    expect(JSON.stringify(sls.variables["azureCredentials"])).toEqual(JSON.stringify(credentials));
    expect(sls.variables["subscriptionId"]).toEqual("azureSubId");
  });

  it("calls interactive login if environment variables are not set", async () => {
    unsetServicePrincipalEnvVariables();
    const sls = MockFactory.createTestServerless();
    await invokeLoginHook(false, sls);
    expect(AzureLoginService.prototype.servicePrincipalLogin).not.toBeCalled();
    expect(AzureLoginService.prototype.interactiveLogin).toBeCalled();
    expect(JSON.stringify(sls.variables["azureCredentials"])).toEqual(JSON.stringify(credentials));
    expect(sls.variables["subscriptionId"]).toEqual("azureSubId");
  });

  it("logs an error from authentication and crashes with it", async () => {
    unsetServicePrincipalEnvVariables();
    const error = new Error("This is my error message")
    AzureLoginService.prototype.interactiveLogin = jest.fn(() => {
      throw error;
    });
    const sls = MockFactory.createTestServerless();
    await expect(invokeLoginHook(false, sls)).rejects.toThrow(error);
    expect(AzureLoginService.prototype.interactiveLogin).toBeCalled();
    expect(AzureLoginService.prototype.servicePrincipalLogin).not.toBeCalled();
    expect(sls.cli.log).lastCalledWith("Error logging into azure");
  });

  it("Uses the default subscription ID" , async () => {
    const sls = MockFactory.createTestServerless();
    const opt = MockFactory.createTestServerlessOptions();
    await invokeLoginHook(false, sls, opt);
    expect(AzureLoginService.prototype.interactiveLogin).toBeCalled();
    expect(sls.variables["subscriptionId"]).toEqual("azureSubId");
    expect(sls.cli.log).toBeCalledWith("Using subscription ID: azureSubId");
  });

  it("Throws an error with empty subscription list", async () => {
    unsetServicePrincipalEnvVariables();
    const authResponse = MockFactory.createTestAuthResponse();
    authResponse.subscriptions = [];
    AzureLoginService.prototype.interactiveLogin = createMockLoginFunction(authResponse);
    const sls = MockFactory.createTestServerless();
    delete sls.variables["subscriptionId"];
    const opt = MockFactory.createTestServerlessOptions();
    await expect(invokeLoginHook(false, sls, opt)).rejects.toThrow();
    expect(AzureLoginService.prototype.interactiveLogin).toBeCalled();
  });

  it("Does not throw an error with empty subscription list if subscription previously specified", async () => {
    unsetServicePrincipalEnvVariables();
    const authResponse = MockFactory.createTestAuthResponse();
    authResponse.subscriptions = [];
    AzureLoginService.prototype.interactiveLogin = createMockLoginFunction(authResponse);
    const sls = MockFactory.createTestServerless();
    delete sls.variables["subscriptionId"];
    const subId = "my subscription id";
    (sls.service as any as ServerlessAzureConfig).provider.subscriptionId = subId;
    const opt = MockFactory.createTestServerlessOptions();
    await invokeLoginHook(false, sls, opt)
    expect(AzureLoginService.prototype.interactiveLogin).toBeCalled();
  });
});
