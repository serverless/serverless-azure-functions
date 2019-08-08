import { AzureLoginService } from "./loginService";
jest.mock("open");
import open from "open";

jest.mock("@azure/ms-rest-nodeauth");
import * as nodeauth from "@azure/ms-rest-nodeauth";

jest.mock("../plugins/login/utils/simpleFileTokenCache");
import { SimpleFileTokenCache } from "../plugins/login/utils/simpleFileTokenCache";

describe("Login Service", () => {

  it("logs in interactively with no cached login", async () => {
    // Ensure env variables are not set
    delete process.env.azureSubId;
    delete process.env.azureServicePrincipalClientId;
    delete process.env.azureServicePrincipalPassword;
    delete process.env.azureServicePrincipalTenantId;

    SimpleFileTokenCache.prototype.isEmpty = jest.fn(() => true);

    const emptyObj = { subscriptions: [] };
    Object.defineProperty(nodeauth,
      "interactiveLoginWithAuthResponse",
      { value: jest.fn(_obj => emptyObj) }
    );

    await AzureLoginService.login();
    expect(SimpleFileTokenCache).toBeCalled();
    expect(open).toBeCalledWith("https://microsoft.com/devicelogin");
    expect(nodeauth.interactiveLoginWithAuthResponse).toBeCalled();
    expect(SimpleFileTokenCache.prototype.addSubs).toBeCalledWith(emptyObj.subscriptions);
  });

  it("logs in with a cached login", async () => {
    // Ensure env variables are not set
    delete process.env.azureSubId;
    delete process.env.azureServicePrincipalClientId;
    delete process.env.azureServicePrincipalPassword;
    delete process.env.azureServicePrincipalTenantId;

    SimpleFileTokenCache.prototype.isEmpty = jest.fn(() => false);
    SimpleFileTokenCache.prototype.first = jest.fn(() => ({ userId: "" }));

    await AzureLoginService.login();
    expect(SimpleFileTokenCache).toBeCalled();
    expect(nodeauth.DeviceTokenCredentials).toBeCalled();
    expect(SimpleFileTokenCache.prototype.listSubscriptions).toBeCalled();
  });

  it("logs in with a service principal", async () => {
    // Set environment variables
    process.env.azureSubId = "azureSubId";
    process.env.azureServicePrincipalClientId = "azureServicePrincipalClientId";
    process.env.azureServicePrincipalPassword = "azureServicePrincipalPassword";
    process.env.azureServicePrincipalTenantId = "azureServicePrincipalTenantId";

    await AzureLoginService.login();
    expect(nodeauth.loginWithServicePrincipalSecretWithAuthResponse).toBeCalledWith(
      "azureServicePrincipalClientId",
      "azureServicePrincipalPassword",
      "azureServicePrincipalTenantId",
      undefined // would be options
    );
  });
});
