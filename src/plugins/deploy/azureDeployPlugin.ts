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

    this.serverless.cli.log("NOTHING to do before deploy")
    // TODO: maybe this is the place to check if all relevant files exist before uploading
  }

  private async deploy() {
    const resourceService = new ResourceService(this.serverless, this.options);
    await resourceService.deployResourceGroup();

    const functionAppService = new FunctionAppService(this.serverless, this.options);

    // create all necessary resources: resource-group, storage account, app service plan, and app service
    const functionApp = await functionAppService.deploy();
    await functionAppService.zipDeploy(functionApp);
  }
}
