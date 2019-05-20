import { ApimService } from '../../services/apimService';

export class AzureApimServicePlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.hooks = {
      'after:deploy:deploy': this.deploy.bind(this)
    };
  }

  async deploy() {
    this.serverless.cli.log('Starting APIM service deployment');

    const apimService = new ApimService(this.serverless, this.options);
    await apimService.deployApi();
    await apimService.deployFunctions();

    this.serverless.cli.log('Finished APIM service deployment');
  }
}