import Serverless from "serverless";
import { AzureLoginService } from "../../services/loginService";
import { MockFactory } from "../../test/mockFactory";
import { invokeHook, setEnvVariables, unsetEnvVariables } from "../../test/utils";
import { AzureLoginPlugin } from "./loginPlugin";

describe("Login Plugin", () => {

  const authResponse = MockFactory.createTestAuthResponse();
  const envVariables = MockFactory.createTestServicePrincipalEnvVariables()
  const credentials = MockFactory.createTestVariables().azureCredentials;

  function createPlugin(hasCreds = false, serverless?: Serverless): AzureLoginPlugin {
    const sls = serverless || MockFactory.createTestServerless();
    if (!hasCreds) {
      delete sls.variables["azureCredentials"];
    }
    const options = MockFactory.createTestServerlessOptions();
    return new AzureLoginPlugin(sls, options);
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

  async function invokeLoginHook(hasCreds = false, serverless?: Serverless) {
    const plugin = createPlugin(hasCreds, serverless);
    await invokeHook(plugin, "before:package:initialize");
  }

  beforeEach(() => {
    AzureLoginService.interactiveLogin = createMockLoginFunction();
    AzureLoginService.servicePrincipalLogin = createMockLoginFunction();
  });

  it("returns if azure credentials are set", async () => {
    await invokeLoginHook(true);
    expect(AzureLoginService.interactiveLogin).not.toBeCalled();
    expect(AzureLoginService.servicePrincipalLogin).not.toBeCalled();
  });

  it("calls login if azure credentials are not set", async () => {
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
      "azureServicePrincipalTenantId"
    )
    expect(AzureLoginService.interactiveLogin).not.toBeCalled();
    expect(sls.variables["azureCredentials"]).toEqual(credentials);
    expect(sls.variables["subscriptionId"]).toEqual("azureSubId");
  });

  it("calls interactive login if environment variables are not set", async () => {
    unsetServicePrincipalEnvVariables();
    const sls = MockFactory.createTestServerless();
    await invokeLoginHook(false, sls);
    expect(AzureLoginService.servicePrincipalLogin).not.toBeCalled();
    expect(AzureLoginService.interactiveLogin).toBeCalled();
    expect(sls.variables["azureCredentials"]).toEqual(credentials);
    expect(sls.variables["subscriptionId"]).toEqual("azureSubId");
  });

  it("logs an error from authentication", async () => {
    unsetServicePrincipalEnvVariables();
    const errorMessage = "This is my error message";
    AzureLoginService.interactiveLogin = jest.fn(() => {
      throw new Error(errorMessage);
    });    
    const sls = MockFactory.createTestServerless();
    await invokeLoginHook(false, sls);
    expect(AzureLoginService.interactiveLogin).toBeCalled()
    expect(AzureLoginService.servicePrincipalLogin).not.toBeCalled();
    expect(sls.cli.log).lastCalledWith(`Error: ${errorMessage}`)
  });
})
