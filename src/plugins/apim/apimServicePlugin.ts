import { ApimService } from '../../services/apimService';

export class AzureApimServicePlugin {
  hooks: any;
  
  constructor(private serverless, private options) {

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