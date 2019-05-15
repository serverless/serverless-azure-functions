import { deployApi } from './lib/deployApi';
import { deployFunctions } from './lib/deployFunctions';

export class AzureApimPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.serverless.cli.log('Initializing Azure APIM plugin');

    this.hooks = {
      'after:deploy:initialize': this.deploy.bind(this)
    };
  }

  async deploy() {
    this.serverless.cli.log('Starting APIM deployment');

    await deployApi(this.serverless, this.options);
    await deployFunctions(this.serverless, this.options);

    this.serverless.cli.log('Successfully deployed API Management API & Operations');
  }
}