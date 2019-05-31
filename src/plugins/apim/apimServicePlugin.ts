import Serverless from "serverless";
import { ApimService } from "../../services/apimService";

export class AzureApimServicePlugin {
  public hooks: { [eventName: string]: Promise<any> };

  public constructor(private serverless: Serverless, private options: Serverless.Options) {
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
    await apimService.deployApi();
    await apimService.deployFunctions();

    this.serverless.cli.log("Finished APIM service deployment");
  }
}