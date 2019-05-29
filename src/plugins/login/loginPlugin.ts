import Serverless from "serverless";
import AzureProvider from "../../provider/azureProvider";
import { AzureLoginService } from "../../services/loginService";

export class AzureLoginPlugin {
  private provider: AzureProvider;
  public hooks: { [eventName: string]: Promise<any> };

  public constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.provider = (this.serverless.getProvider("azure") as any) as AzureProvider;

    this.hooks = {
      "before:package:initialize": this.login.bind(this)
    };
  }

  private async login() {
    // If credentials have already been set then short circuit
    if (this.serverless.variables["azureCredentials"]) {
      return;
    }

    this.serverless.cli.log("Logging into Azure");

    try {
      const authResult = await AzureLoginService.login();
      this.serverless.variables["azureCredentials"] = authResult.credentials;
      // Use environment variable for sub ID or use the first subscription in the list (service principal can
      // have access to more than one subscription)
      this.serverless.variables["subscriptionId"] = process.env.azureSubId || authResult.subscriptions[0].id;
    }
    catch (e) {
      this.serverless.cli.log("Error logging into azure");
      this.serverless.cli.log(`${e}`);
    }
  }
}