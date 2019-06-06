import Serverless from "serverless";
import { ApimService } from "../../services/apimService";

export class AzureApimFunctionPlugin {
  public hooks: { [eventName: string]: Promise<any> };

  public constructor(private serverless: Serverless, private options: Serverless.Options) {
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

    this.serverless.cli.log("Finished APIM function deployment");
  }
}