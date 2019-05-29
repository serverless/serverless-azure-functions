import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureLoginPlugin } from "./loginPlugin";
import { AzureLoginService } from "../../services/loginService";

describe("Login Plugin", () => {

  const authResponse = MockFactory.createTestAuthResponse();

  it("returns if azure credentials are set", async () => {
    const interactiveLogin = jest.fn(() => Promise.resolve(authResponse));
    const servicePrincipalLogin = jest.fn(() => Promise.resolve(authResponse));

    AzureLoginService.interactiveLogin = interactiveLogin;
    AzureLoginService.servicePrincipalLogin = servicePrincipalLogin;

    const sls = MockFactory.createTestServerless();
    sls.variables["azureCredentials"] = "credentials";
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureLoginPlugin(sls, options);

    await invokeHook(plugin, "before:package:initialize");

    expect(interactiveLogin).not.toBeCalled();
    expect(servicePrincipalLogin).not.toBeCalled();
  });

  it("calls login if azure credentials are not set", async () => {
    const interactiveLogin = jest.fn(() => Promise.resolve(authResponse));
    const servicePrincipalLogin = jest.fn(() => Promise.resolve(authResponse));

    AzureLoginService.interactiveLogin = interactiveLogin;
    AzureLoginService.servicePrincipalLogin = servicePrincipalLogin;

    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureLoginPlugin(sls, options);

    await invokeHook(plugin, "before:package:initialize");

    expect(interactiveLogin).toBeCalled();
    expect(servicePrincipalLogin).not.toBeCalled();
  });

  it("calls service principal login if environment variables are set", async () => {

    process.env.azureSubId = "azureSubId";
    process.env.azureServicePrincipalClientId = "azureServicePrincipalClientId";
    process.env.azureServicePrincipalPassword = "azureServicePrincipalPassword";
    process.env.azureServicePrincipalTenantId = "azureServicePrincipalTenantId";

    const interactiveLogin = jest.fn(() => Promise.resolve(authResponse));
    const servicePrincipalLogin = jest.fn(() => Promise.resolve(authResponse));

    AzureLoginService.interactiveLogin = interactiveLogin;
    AzureLoginService.servicePrincipalLogin = servicePrincipalLogin;
    
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureLoginPlugin(sls, options);
    await invokeHook(plugin, "before:package:initialize");
    expect(servicePrincipalLogin).toBeCalledWith(
      "azureServicePrincipalClientId",
      "azureServicePrincipalPassword",
      "azureServicePrincipalTenantId"
    )
    expect(interactiveLogin).not.toBeCalled();

    expect(sls.variables["azureCredentials"]).toEqual(authResponse.credentials);
    expect(sls.variables["subscriptionId"]).toEqual("azureSubId");
  });

  it("calls interactive login if environment variables are not set", async () => {
    delete process.env.azureSubId;
    delete process.env.azureServicePrincipalClientId;
    delete process.env.azureServicePrincipalPassword;
    delete process.env.azureServicePrincipalTenantId;

    const interactiveLogin = jest.fn(() => Promise.resolve(authResponse));
    const servicePrincipalLogin = jest.fn(() => Promise.resolve(authResponse));

    AzureLoginService.interactiveLogin = interactiveLogin;
    AzureLoginService.servicePrincipalLogin = servicePrincipalLogin;

    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureLoginPlugin(sls, options);
    await invokeHook(plugin, "before:package:initialize");
    expect(servicePrincipalLogin).not.toBeCalled();
    expect(interactiveLogin).toBeCalled();

    expect(sls.variables["azureCredentials"]).toEqual(authResponse.credentials);
    expect(sls.variables["subscriptionId"]).toEqual("azureSubId");
  });

  it("logs an error from authentication", async () => {
    process.env.azureSubId = "azureSubId";
    process.env.azureServicePrincipalClientId = "azureServicePrincipalClientId";
    process.env.azureServicePrincipalPassword = "azureServicePrincipalPassword";
    process.env.azureServicePrincipalTenantId = "azureServicePrincipalTenantId";

    const interactiveLogin = jest.fn(() => Promise.resolve(authResponse));
    const errorMessage = "This is my error message";
    const servicePrincipalLogin = jest.fn(() => {
      throw new Error(errorMessage);
    });

    AzureLoginService.interactiveLogin = interactiveLogin;
    AzureLoginService.servicePrincipalLogin = servicePrincipalLogin;
    
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureLoginPlugin(sls, options);
    await invokeHook(plugin, "before:package:initialize");
    expect(servicePrincipalLogin).toBeCalledWith(
      "azureServicePrincipalClientId",
      "azureServicePrincipalPassword",
      "azureServicePrincipalTenantId"
    )
    expect(interactiveLogin).not.toBeCalled();
    expect(sls.cli.log).lastCalledWith(`Error: ${errorMessage}`)
  });
})