import Serverless from "serverless";
import { AzureLoginService } from "../../services/loginService";
import { MockFactory } from "../../test/mockFactory";
import { invokeHook, setEnvVariables, unsetEnvVariables } from "../../test/utils";
import { AzureLoginPlugin } from "./azureLoginPlugin";
import { loginHooks } from "./loginHooks";

describe("Login Plugin", () => {

  const authResponse = MockFactory.createTestAuthResponse();
  const envVariables = MockFactory.createTestServicePrincipalEnvVariables()
  const credentials = MockFactory.createTestVariables().azureCredentials;

  function createPlugin(hasCreds = false, serverless?: Serverless, options?: Serverless.Options): AzureLoginPlugin {
    const sls = serverless || MockFactory.createTestServerless();
    if (!hasCreds) {
      delete sls.variables["azureCredentials"];
    }
    return new AzureLoginPlugin(sls, options || MockFactory.createTestServerlessOptions());
  }

  function createMockLoginFunction() {
    return jest.fn(() => Promise.resolve(authResponse));
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
    AzureLoginService.interactiveLogin = createMockLoginFunction();
    AzureLoginService.servicePrincipalLogin = createMockLoginFunction();
  });

  it("contains the hooks as contained in loginHooks", () => {
    expect(Object.keys(createPlugin().hooks)).toEqual(loginHooks.map((hook) => `before:${hook}`));
  });

  it("returns if azure credentials are set", async () => {
    await invokeLoginHook(true);
    expect(AzureLoginService.interactiveLogin).not.toBeCalled();
    expect(AzureLoginService.servicePrincipalLogin).not.toBeCalled();
  });

  it("calls login if azure credentials are not set", async () => {
    unsetServicePrincipalEnvVariables();
    await invokeLoginHook();
    expect(AzureLoginService.interactiveLogin).toBeCalled();
    expect(AzureLoginService.servicePrincipalLogin).not.toBeCalled();
  });

  it("calls service principal login if environment variables are set", async () => {
    setServicePrincipalEnvVariables();
    const sls = MockFactory.createTestServerless();
    await invokeLoginHook(false, sls);
    expect(AzureLoginService.servicePrincipalLogin).toBeCalledWith(
      "azureServicePrincipalClientId",
      "azureServicePrincipalPassword",
      "azureServicePrincipalTenantId",
      undefined // would be options
    )
    expect(AzureLoginService.interactiveLogin).not.toBeCalled();
    expect(JSON.stringify(sls.variables["azureCredentials"])).toEqual(JSON.stringify(credentials));
    expect(sls.variables["subscriptionId"]).toEqual("azureSubId");
  });

  it("calls interactive login if environment variables are not set", async () => {
    unsetServicePrincipalEnvVariables();
    const sls = MockFactory.createTestServerless();
    await invokeLoginHook(false, sls);
    expect(AzureLoginService.servicePrincipalLogin).not.toBeCalled();
    expect(AzureLoginService.interactiveLogin).toBeCalled();
    expect(JSON.stringify(sls.variables["azureCredentials"])).toEqual(JSON.stringify(credentials));
    expect(sls.variables["subscriptionId"]).toEqual("azureSubId");
  });

  it("logs an error from authentication and exits process", async () => {
    unsetServicePrincipalEnvVariables();
    process.exit = jest.fn() as any;
    const errorMessage = "This is my error message";
    AzureLoginService.interactiveLogin = jest.fn(() => {
      throw new Error(errorMessage);
    });
    const sls = MockFactory.createTestServerless();
    await invokeLoginHook(false, sls);
    expect(AzureLoginService.interactiveLogin).toBeCalled()
    expect(AzureLoginService.servicePrincipalLogin).not.toBeCalled();
    expect(sls.cli.log).lastCalledWith(`Error: ${errorMessage}`);
    expect(process.exit).toBeCalledWith(0);
  });

  it("Uses the user specified subscription ID", async () => {
    const sls = MockFactory.createTestServerless();
    const opt = MockFactory.createTestServerlessOptions();
    opt["subscriptionId"] = "test-subs-id";
    await invokeLoginHook(false, sls, opt);
    expect(AzureLoginService.interactiveLogin).toBeCalled()
    expect(sls.variables["subscriptionId"]).toEqual("test-subs-id");
    expect(sls.cli.log).toBeCalledWith("Using subscription ID: test-subs-id");
  });

  it("Uses the default subscription ID" , async () => {
    const sls = MockFactory.createTestServerless();
    const opt = MockFactory.createTestServerlessOptions();
    await invokeLoginHook(false, sls, opt);
    expect(AzureLoginService.interactiveLogin).toBeCalled()
    expect(sls.variables["subscriptionId"]).toEqual("azureSubId");
    expect(sls.cli.log).toBeCalledWith("Using subscription ID: azureSubId");
  });

  it("Uses the subscription ID specified in serverless yaml", async () => {
    const sls = MockFactory.createTestServerless();
    const opt = MockFactory.createTestServerlessOptions();
    sls.service.provider["subscriptionId"] = "test-subs-id";
    await invokeLoginHook(false, sls, opt);
    expect(AzureLoginService.interactiveLogin).toBeCalled()
    expect(sls.variables["subscriptionId"]).toEqual("test-subs-id");
    expect(sls.cli.log).toBeCalledWith("Using subscription ID: test-subs-id");
  });
});
