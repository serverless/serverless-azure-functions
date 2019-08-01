import Serverless from "serverless";
import { AzureLoginOptions, AzureLoginService } from "../../services/loginService";
import { AzureBasePlugin } from "../azureBasePlugin";
import { loginHooks } from "./loginHooks";
import { SimpleFileTokenCache } from "./utils/simpleFileTokenCache";

export class AzureLoginPlugin extends AzureBasePlugin<AzureLoginOptions> {
  private fileTokenCache: SimpleFileTokenCache;
  public hooks: { [eventName: string]: Promise<any> };

  public constructor(serverless: Serverless, options: AzureLoginOptions) {
    super(serverless, options);

    this.fileTokenCache = new SimpleFileTokenCache();

    this.hooks = {};
    for (const h of loginHooks) {
      this.hooks[`before:${h}`] = this.login.bind(this);
    }
  }

  private async login() {
    // If credentials have already been set then short circuit
    if (this.serverless.variables["azureCredentials"]) {
      return;
    }

    this.log("Logging into Azure");

    try {
      const authResult = await AzureLoginService.login({tokenCache: this.fileTokenCache});
      this.serverless.variables["azureCredentials"] = authResult.credentials;
      // Use environment variable for sub ID or use the first subscription in the list (service principal can
      // have access to more than one subscription)
      this.serverless.variables["subscriptionId"] = this.options.subscriptionId || process.env.azureSubId || this.serverless.service.provider["subscriptionId"] || authResult.subscriptions[0].id;
      this.serverless.cli.log(`Using subscription ID: ${this.serverless.variables["subscriptionId"]}`);
      this.fileTokenCache.addSubs(authResult.subscriptions);
    }
    catch (e) {
      this.log("Error logging into azure");
      this.log(`${e}`);
      process.exit(0);
    }
  }
}
