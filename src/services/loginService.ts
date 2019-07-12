import open from "open";
import {
  interactiveLoginWithAuthResponse,
  loginWithServicePrincipalSecretWithAuthResponse,
  AuthResponse,
  AzureTokenCredentialsOptions,
  InteractiveLoginOptions,  
} from "@azure/ms-rest-nodeauth";


export class AzureLoginService {

  /**
   * Logs in via service principal login if environment variables are
   * set or via interactive login if environment variables are not set
   * @param options Options for different authentication methods
   */
  public static async login(options?: AzureTokenCredentialsOptions|InteractiveLoginOptions): Promise<AuthResponse> {
    const subscriptionId = process.env.azureSubId;
    const clientId = process.env.azureServicePrincipalClientId;
    const secret = process.env.azureServicePrincipalPassword;
    const tenantId = process.env.azureServicePrincipalTenantId;

    if (subscriptionId && clientId && secret && tenantId) {
      return await AzureLoginService.servicePrincipalLogin(clientId, secret, tenantId, options);
    } else {
      return await AzureLoginService.interactiveLogin(options);
    }
  }

  public static async interactiveLogin(options: InteractiveLoginOptions): Promise<AuthResponse> {
    await open("https://microsoft.com/devicelogin");
    return await interactiveLoginWithAuthResponse(options);
  }

  public static async servicePrincipalLogin(clientId: string, secret: string, tenantId: string, options: AzureTokenCredentialsOptions): Promise<AuthResponse> {
    return loginWithServicePrincipalSecretWithAuthResponse(clientId, secret, tenantId, options);
  }
}
