import open from "open";
import Serverless from "serverless";
import {
  interactiveLoginWithAuthResponse,
  loginWithServicePrincipalSecretWithAuthResponse,
  AuthResponse,
  AzureTokenCredentialsOptions,
  InteractiveLoginOptions,
  DeviceTokenCredentials,  
} from "@azure/ms-rest-nodeauth";
import { SimpleFileTokenCache } from "../plugins/login/utils/simpleFileTokenCache";

export interface AzureLoginOptions extends Serverless.Options {
  subscriptionId?: string;
}

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

  public static async interactiveLogin(options?: InteractiveLoginOptions): Promise<AuthResponse> {
    let authResp: AuthResponse = {credentials: undefined, subscriptions: []};
    const fileTokenCache = new SimpleFileTokenCache();
    if(fileTokenCache.isEmpty()){
      await open("https://microsoft.com/devicelogin");
      authResp = await interactiveLoginWithAuthResponse({...options, tokenCache: fileTokenCache});
      fileTokenCache.addSubs(authResp.subscriptions);
    } else {
      authResp.credentials = new DeviceTokenCredentials(undefined, undefined, fileTokenCache.first().userId, undefined, undefined, fileTokenCache);
      authResp.subscriptions = fileTokenCache.listSubscriptions();
    }

    return authResp;

  }

  public static async servicePrincipalLogin(clientId: string, secret: string, tenantId: string, options: AzureTokenCredentialsOptions): Promise<AuthResponse> {
    return loginWithServicePrincipalSecretWithAuthResponse(clientId, secret, tenantId, options);
  }
}
