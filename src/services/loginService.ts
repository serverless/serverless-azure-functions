import { interactiveLoginWithAuthResponse, loginWithServicePrincipalSecretWithAuthResponse } from "@azure/ms-rest-nodeauth";
import open from "open";

export class AzureLoginService {

  public static async login() {
    const subscriptionId = process.env.azureSubId;
    const clientId = process.env.azureServicePrincipalClientId;
    const secret = process.env.azureServicePrincipalPassword;
    const tenantId = process.env.azureServicePrincipalTenantId;

    if (subscriptionId && clientId && secret && tenantId) {
      return await AzureLoginService.servicePrincipalLogin(clientId, secret, tenantId);
    } else {
      return await AzureLoginService.interactiveLogin();
    }
  }

  public static async interactiveLogin() {
    await open("https://microsoft.com/devicelogin");
    return await interactiveLoginWithAuthResponse();
  }

  public static async servicePrincipalLogin(clientId: string, secret: string, tenantId: string) {
    return loginWithServicePrincipalSecretWithAuthResponse(clientId, secret, tenantId);
  }
}