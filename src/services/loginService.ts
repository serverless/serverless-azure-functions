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
import { BaseService } from "./baseService";

export interface AzureLoginOptions extends Serverless.Options {
  subscriptionId?: string;
}

export class AzureLoginService extends BaseService {

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options, false);
  }

  /**
   * Logs in via service principal login if environment variables are
   * set or via interactive login if environment variables are not set
   * @param options Options for different authentication methods
   */
  public async login(options?: AzureTokenCredentialsOptions | InteractiveLoginOptions): Promise<AuthResponse> {
    const subscriptionId = this.configService.getSubscriptionId();
    const clientId = process.env.AZURE_CLIENT_ID;
    const secret = process.env.AZURE_CLIENT_SECRET;
    const tenantId = process.env.AZURE_TENANT_ID;

    if (subscriptionId && clientId && secret && tenantId) {
      return await this.servicePrincipalLogin(clientId, secret, tenantId, options);
    } else {
      return await this.interactiveLogin(options);
    }
  }

  public async interactiveLogin(options?: InteractiveLoginOptions): Promise<AuthResponse> {
    let authResp: AuthResponse = { credentials: undefined, subscriptions: [] };
    const fileTokenCache = new SimpleFileTokenCache();
    if (fileTokenCache.isEmpty()) {
      await open("https://microsoft.com/devicelogin");
      authResp = await interactiveLoginWithAuthResponse({ ...options, tokenCache: fileTokenCache });
      fileTokenCache.addSubs(authResp.subscriptions);
    } else {
      authResp.credentials = new DeviceTokenCredentials(undefined, undefined, fileTokenCache.first().userId, undefined, undefined, fileTokenCache);
      authResp.subscriptions = fileTokenCache.listSubscriptions();
    }

    return authResp;
  }

  public async servicePrincipalLogin(clientId: string, secret: string, tenantId: string, options: AzureTokenCredentialsOptions): Promise<AuthResponse> {
    return await loginWithServicePrincipalSecretWithAuthResponse(clientId, secret, tenantId, options);
  }

  public getSubscriptionId() {
    return this.configService.getSubscriptionId();
  }
}
