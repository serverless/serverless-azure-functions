import Serverless from 'serverless';
import { ResourceService } from '../../services/resourceService';
import { FunctionAppService } from '../../services/functionAppService';

export class AzureDeployPlugin {
  public hooks: { [eventName: string]: Promise<any> };

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      'deploy:deploy': this.deploy.bind(this)
    };
  }

  private async deploy() {
    const resourceService = new ResourceService(this.serverless, this.options);
    await resourceService.deployResourceGroup();

    const functionAppService = new FunctionAppService(this.serverless, this.options);

    const functionApp = await functionAppService.deploy();
    await functionAppService.uploadFunctions(functionApp);
  }
}
