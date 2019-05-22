import * as open from 'open';
import { interactiveLoginWithAuthResponse, loginWithServicePrincipalSecretWithAuthResponse } from '@azure/ms-rest-nodeauth';
import * as Serverless from 'serverless';
import AzureProvider from '../../provider/azureProvider';

export class AzureLoginPlugin {
  private provider: AzureProvider;
  public hooks: { [eventName: string]: Promise<any> };

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.provider = (this.serverless.getProvider('azure') as any) as AzureProvider;

    this.hooks = {
      'before:package:initialize': this.login.bind(this)
    };
  }

  private async login() {
    this.serverless.cli.log('Logging into Azure');

    let authResult = null;

    const subscriptionId = process.env.azureSubId;
    const clientId = process.env.azureServicePrincipalClientId;
    const secret = process.env.azureServicePrincipalPassword;
    const tenantId = process.env.azureServicePrincipalTenantId;

    try {
      if (subscriptionId && clientId && secret && tenantId) {
        authResult = await loginWithServicePrincipalSecretWithAuthResponse(clientId, secret, tenantId);
      }
      else {
        await open('https://microsoft.com/devicelogin');
        authResult = await interactiveLoginWithAuthResponse();
      }

      // TODO: This is temporary until the azure provider goes away
      this.provider.credentials = authResult.credentials;

      this.serverless.variables['azureAccessToken'] = authResult.credentials.tokenCache._entries[0].accessToken;
      this.serverless.variables['azureCredentials'] = authResult.credentials;
      this.serverless.variables['subscriptionId'] = authResult.subscriptionId || subscriptionId;
    }
    catch (e) {
      this.serverless.cli.log('Error logging into azure');
      this.serverless.cli.log(e);
    }
  }
}