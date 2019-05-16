import open from 'open';
import { interactiveLoginWithAuthResponse, loginWithServicePrincipalSecretWithAuthResponse } from '@azure/ms-rest-nodeauth';

export class AzureLoginPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.serverless.cli.log('Initializing Azure Login plugin');

    this.hooks = {
      'before:deploy:initialize': this.login.bind(this)
    };
  }

  async login() {
    this.serverless.cli.log('Logging into Azure');

    let authResult = null;

    const clientId = process.env.azureServicePrincipalClientId;
    const secret = process.env.azureServicePrincipalPassword;
    const tenantId = process.env.azureServicePrincipalTenantId;

    try {
      if (clientId && secret && tenantId) {
        authResult = await loginWithServicePrincipalSecretWithAuthResponse(clientId, secret, tenantId);
      } else {
        await open('https://microsoft.com/devicelogin');
        authResult = await interactiveLoginWithAuthResponse();
      }

      this.serverless.variables.azureCredentials = authResult.credentials;
    }
    catch (e) {
      this.serverless.cli.log('Error logging into azure');
      this.serverless.cli.log(e);
    }
  }
}