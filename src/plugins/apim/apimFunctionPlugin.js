import { ApimService } from '../../services/apimService';

export class AzureApimFunctionPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.hooks = {
      'after:deploy:function:deploy': this.deploy.bind(this)
    };
  }

  async deploy() {
    this.serverless.cli.log('Starting APIM function deployment');

    const apimService = new ApimService(this.serverless, this.options);
    await apimService.deployFunction(this.options);

    this.serverless.cli.log('Finished APIM function deployment');
  }
}