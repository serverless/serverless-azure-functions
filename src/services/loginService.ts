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
    // await open("https://microsoft.com/devicelogin");
    // return await interactiveLoginWithAuthResponse(options);
    var authResp: AuthResponse = {credentials: undefined, subscriptions: []};
    if(!(options.tokenCache as SimpleFileTokenCache).empty()){
      console.log("exisitng token");
      var devOptions = {
        tokenCache: options.tokenCache as SimpleFileTokenCache
      }
      // I don't think DeviceTokenCredentials is what we want... maybe MSITokenCredentials?
      authResp.credentials = new DeviceTokenCredentials(undefined, undefined, devOptions.tokenCache.first().userId, undefined, undefined, options.tokenCache);
      authResp.subscriptions = devOptions.tokenCache.listSubscriptions();
    } else {
      console.log("need to do interactive login now");
      await open("https://microsoft.com/devicelogin");
      authResp = await interactiveLoginWithAuthResponse(options); 
    }
    return authResp;//iOptions ? interactiveLoginWithAuthResponse(iOptions) : interactiveLoginWithAuthResponse();

  }

  public static async servicePrincipalLogin(clientId: string, secret: string, tenantId: string, options: AzureTokenCredentialsOptions): Promise<AuthResponse> {
    return loginWithServicePrincipalSecretWithAuthResponse(clientId, secret, tenantId, options);
  }
}
