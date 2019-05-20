import { open } from 'open';
import { interactiveLoginWithAuthResponse, loginWithServicePrincipalSecretWithAuthResponse } from '@azure/ms-rest-nodeauth';
import AzureProvider from '../../provider/azureProvider';

export class AzureLoginPlugin {
  private provider: AzureProvider;
  private hooks: any;

  constructor(private serverless, private options) {
    this.provider = this.serverless.getProvider('azure');

    this.hooks = {
      'before:deploy:initialize': this.login.bind(this)
    };
  }

  async login() {
    this.serverless.cli.log('Logging into Azure');

    let authResult = null;

    const subscriptionId = process.env.azureSubId;
    const clientId = process.env.azureServicePrincipalClientId;
    const secret = process.env.azureServicePrincipalPassword;
    const tenantId = process.env.azureServicePrincipalTenantId;

    try {
      if (subscriptionId && clientId && secret && tenantId) {
        authResult = await loginWithServicePrincipalSecretWithAuthResponse(clientId, secret, tenantId);
      } else {
        await open('https://microsoft.com/devicelogin');
        authResult = await interactiveLoginWithAuthResponse();
      }
      this.serverless.variables.azureAccessToken = authResult.credentials.tokenCache._entries[0].accessToken;
      this.serverless.variables.azureCredentials = authResult.credentials;
      this.serverless.variables.subscriptionId = authResult.subscriptionId || subscriptionId;
    }
    catch (e) {
      this.serverless.cli.log('Error logging into azure');
      this.serverless.cli.log(e);
    }
  }
}