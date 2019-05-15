import open from 'open';
import { interactiveLoginWithAuthResponse } from '@azure/ms-rest-nodeauth';

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

    try {
      await open('https://microsoft.com/devicelogin');
      const authResult = await interactiveLoginWithAuthResponse();

      this.serverless.variables.azureCredentials = authResult.credentials;
    }
    catch (e) {
      this.serverless.cli.log('Error logging into azure');
    }
  }
}