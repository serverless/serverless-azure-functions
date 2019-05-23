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
    // TODO: maybe this is the place to check if all relevant files exist before uploading
    this.serverless.cli.log("NOTHING ELSE to do before deploy")
  }

  private async deploy() {
    const resourceService = new ResourceService(this.serverless, this.options);
    await resourceService.deployResourceGroup();

    const functionAppService = new FunctionAppService(this.serverless, this.options);

    const functionApp = await functionAppService.deploy();
    await functionAppService.zipDeploy(functionApp);
  }
}
