import { ApimService } from './apimService';

export class AzureApimFunctionPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.serverless.cli.log('Initializing Azure APIM function plugin');

    this.hooks = {
      'after:deploy:function:deploy': this.deploy.bind(this)
    };
  }

  async deploy() {
    this.serverless.cli.log('Starting APIM function deployment');

    const apimService = new ApimService(this.serverless, this.options);
    await apimService.deployFunction(this.options);

    this.serverless.cli.log('Successfully deployed function');
  }
}