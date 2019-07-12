import Serverless from "serverless";
import AzureProvider from "../../provider/azureProvider";
import { AzureLoginService } from "../../services/loginService";
import { AzureBasePlugin } from "../azureBasePlugin";

export class AzureLoginPlugin extends AzureBasePlugin {
  private provider: AzureProvider;
  public hooks: { [eventName: string]: Promise<any> };

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
    this.provider = (this.serverless.getProvider("azure") as any) as AzureProvider;

    this.hooks = {
      "before:package:initialize": this.login.bind(this),
      "before:deploy:list:list": this.login.bind(this),
      "before:invoke:invoke": this.login.bind(this),
      "before:rollback:rollback": this.login.bind(this),
    };
  }

  private async login() {
    // If credentials have already been set then short circuit
    if (this.serverless.variables["azureCredentials"]) {
      return;
    }

    this.log("Logging into Azure");

    try {
      const authResult = await AzureLoginService.login();
      this.serverless.variables["azureCredentials"] = authResult.credentials;
      // Use environment variable for sub ID or use the first subscription in the list (service principal can
      // have access to more than one subscription)
      this.serverless.variables["subscriptionId"] = process.env.azureSubId || authResult.subscriptions[0].id;
    }
    catch (e) {
      this.log("Error logging into azure");
      this.log(`${e}`);
      process.exit(0);
    }
  }
}
