import { ResourceService } from '../../services/resourceService';
import { FunctionAppService } from '../../services/functionAppService';

export class AzureDeployPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.hooks = {
      'before:deploy:deploy': this.beforeDeploy.bind(this),
      'deploy:deploy': this.deploy.bind(this),
      'sync:sync': this
    };
  }

  async beforeDeploy() {
    const functionAppService = new FunctionAppService(this.serverless, this.options);
    const functionApp = await functionAppService.get();

    if (functionApp) {
      await functionAppService.cleanUp(functionApp);
    }
  }

  async sync() {
    const functionAppService = new FunctionAppService(this.serverless, this.options);
    const functionApp = await functionAppService.get();

    await functionAppService.syncTriggers(functionApp);
  }

  async upload() {
    const functionAppService = new FunctionAppService(this.serverless, this.options);
    const functionApp = await functionAppService.get();
    await functionAppService.uploadFunctions(functionApp);
  }

  async deploy() {
    const resourceService = new ResourceService(this.serverless, this.options);
    await resourceService.deployResourceGroup();

    const functionAppService = new FunctionAppService(this.serverless, this.options);
    const functionApp = await functionAppService.deploy();

    await functionAppService.uploadFunctions(functionApp);
    await functionAppService.syncTriggers(functionApp);
  }
}
