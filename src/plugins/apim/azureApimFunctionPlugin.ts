import Serverless from "serverless";
import { ApimService } from "../../services/apimService";
import { AzureBasePlugin } from "../azureBasePlugin";

export class AzureApimFunctionPlugin extends AzureBasePlugin {

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
    this.hooks = {
      "after:deploy:function:deploy": this.deploy.bind(this)
    };
  }

  private async deploy() {
    this.serverless.cli.log("Starting APIM function deployment");

    const apimService = new ApimService(this.serverless, this.options);
    const service = await apimService.get();
    const api = await apimService.getApi();

    await apimService.deployFunction(service, api, this.options);

    this.log("Finished APIM function deployment");
  }
}
