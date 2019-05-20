import { ApimService } from '../../services/apimService';

export class AzureApimFunctionPlugin {
  hooks: any;
  
  constructor(private serverless, private options) {

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