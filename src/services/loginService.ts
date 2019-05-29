import {
  interactiveLoginWithAuthResponse,
  loginWithServicePrincipalSecretWithAuthResponse,
  AuthResponse,
} from '@azure/ms-rest-nodeauth';

export class AzureLoginService {
  public static async login(): Promise<AuthResponse> {
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

  public static async interactiveLogin(): Promise<AuthResponse> {
    await open("https://microsoft.com/devicelogin");
    return await interactiveLoginWithAuthResponse();
  }

  public static async servicePrincipalLogin(clientId: string, secret: string, tenantId: string): Promise<AuthResponse> {
    return loginWithServicePrincipalSecretWithAuthResponse(clientId, secret, tenantId);
  }
}
