import Serverless from "serverless";
import { ApimService } from "../../services/apimService";
import { AzureBasePlugin } from "../azureBasePlugin";

export class AzureApimPlugin extends AzureBasePlugin {

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
    this.hooks = {
      "after:deploy:deploy": this.deploy.bind(this),
    };
  }

  private async deploy() {
    const apimConfig = this.serverless.service.provider["apim"];
    if (!apimConfig || this.getOption("dryrun")) {
      return Promise.resolve();
    }

    this.log("Starting APIM service deployment");

    const apimService = new ApimService(this.serverless, this.options);
    await apimService.deploy();

    this.log("Finished APIM service deployment");
  }
}
