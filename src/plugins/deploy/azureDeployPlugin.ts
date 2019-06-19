import Serverless from "serverless";
import { ResourceService } from "../../services/resourceService";
import { FunctionAppService } from "../../services/functionAppService";

export class AzureDeployPlugin {
  public hooks: { [eventName: string]: Promise<any> };

  public constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      "deploy:deploy": this.deploy.bind(this)
    };
  }

  private async deploy() {
    this.serverless.cli.log("OPTIONS");
    this.serverless.cli.log(JSON.stringify(this.options, null, 4));
    this.serverless.cli.log("PROVIDER REGION");
    this.serverless.cli.log(this.serverless.service.provider.region);

    const resourceService = new ResourceService(this.serverless, this.options);
    await resourceService.deployResourceGroup();

    const functionAppService = new FunctionAppService(this.serverless, this.options);

    const functionApp = await functionAppService.deploy();
    await functionAppService.uploadFunctions(functionApp);
  }
}
