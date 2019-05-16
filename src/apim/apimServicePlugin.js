import { ApimService } from './apimService';

export class AzureApimServicePlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.serverless.cli.log('Initializing Azure APIM plugin');

    this.hooks = {
      'after:deploy:deploy': this.deploy.bind(this)
    };
  }

  async deploy() {
    this.serverless.cli.log('Starting APIM deployment');

    const apimService = new ApimService(this.serverless, this.options);
    await apimService.deployApi();
    await apimService.deployFunctions();

    this.serverless.cli.log('Successfully deployed API Management API & Operations');
  }
}