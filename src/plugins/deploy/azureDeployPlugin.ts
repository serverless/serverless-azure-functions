import Serverless from 'serverless';
import { ResourceService } from '../../services/resourceService';
import { FunctionAppService } from '../../services/functionAppService';

export class AzureDeployPlugin {
  public hooks: { [eventName: string]: Promise<any> };

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      'before:deploy:deploy': this.beforeDeploy.bind(this),
      'deploy:deploy': this.deploy.bind(this)
    };
  }

  private async beforeDeploy() {
    const functionAppService = new FunctionAppService(this.serverless, this.options);
    const functionApp = await functionAppService.get();

    if (functionApp) {
      await functionAppService.cleanUp(functionApp);
    }
  }

  private async deploy() {
    const resourceService = new ResourceService(this.serverless, this.options);
    await resourceService.deployResourceGroup();

    const functionAppService = new FunctionAppService(this.serverless, this.options);
    const functionApp = await functionAppService.deploy();

    await functionAppService.uploadFunctions(functionApp);
    await functionAppService.syncTriggers(functionApp);
  }
}
