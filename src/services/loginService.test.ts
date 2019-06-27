import { AzureLoginService } from "./loginService";
jest.mock("open");
import open from "open";

jest.mock("@azure/ms-rest-nodeauth")
import { interactiveLoginWithAuthResponse, loginWithServicePrincipalSecretWithAuthResponse } from "@azure/ms-rest-nodeauth";

describe("Login Service", () => {
  
  it("logs in interactively", async () => {
    // Ensure env variables are not set
    delete process.env.azureSubId;
    delete process.env.azureServicePrincipalClientId;
    delete process.env.azureServicePrincipalPassword;
    delete process.env.azureServicePrincipalTenantId;

    await AzureLoginService.login();
    expect(open).toBeCalledWith("https://microsoft.com/devicelogin")
    expect(interactiveLoginWithAuthResponse).toBeCalled();
  });

  it("logs in with a service principal", async () => {
    // Set environment variables
    process.env.azureSubId = "azureSubId";
    process.env.azureServicePrincipalClientId = "azureServicePrincipalClientId";
    process.env.azureServicePrincipalPassword = "azureServicePrincipalPassword";
    process.env.azureServicePrincipalTenantId = "azureServicePrincipalTenantId";

    await AzureLoginService.login();
    expect(loginWithServicePrincipalSecretWithAuthResponse).toBeCalledWith(
      "azureServicePrincipalClientId",
      "azureServicePrincipalPassword",
      "azureServicePrincipalTenantId",
      undefined // would be options
    );
  });
});