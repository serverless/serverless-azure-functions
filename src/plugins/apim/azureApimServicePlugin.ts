import Serverless from "serverless";
import { ApimService } from "../../services/apimService";
import { AzureBasePlugin } from "../azureBasePlugin";

export class AzureApimServicePlugin extends AzureBasePlugin {
  public hooks: { [eventName: string]: Promise<any> };

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
    this.hooks = {
      "after:deploy:deploy": this.deploy.bind(this)
    };
  }

  private async deploy() {
    const apimConfig = this.serverless.service.provider["apim"];
    if (!apimConfig) {
      return Promise.resolve();
    }

    this.serverless.cli.log("Starting APIM service deployment");

    const apimService = new ApimService(this.serverless, this.options);
    const service = await apimService.get();
    const api = await apimService.deployApi();
    await apimService.deployFunctions(service, api);

    this.log("Finished APIM service deployment");
  }
}
