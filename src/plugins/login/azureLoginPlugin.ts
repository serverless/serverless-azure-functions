import Serverless from "serverless";
import { AzureLoginOptions, AzureLoginService } from "../../services/loginService";
import { AzureBasePlugin } from "../azureBasePlugin";
import { loginHooks } from "./loginHooks";

export class AzureLoginPlugin extends AzureBasePlugin<AzureLoginOptions> {

  public constructor(serverless: Serverless, options: AzureLoginOptions) {
    super(serverless, options);

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
      const loginService = new AzureLoginService(this.serverless, this.options);
      const authResult = await loginService.login();

      this.serverless.variables["azureCredentials"] = authResult.credentials;
      // Use environment variable for sub ID or use the first subscription in the list (service principal can
      // have access to more than one subscription)
      let subId = loginService.getSubscriptionId();
      if (!subId && !authResult.subscriptions.length) {
        throw new Error("Authentication returned an empty list of subscriptions. " +
          "Try another form of authentication. See the serverless-azure-functions README for more help");
      }
      subId = subId || authResult.subscriptions[0].id;
      this.serverless.variables["subscriptionId"] = subId;
      this.log(`Using subscription ID: ${subId}`);
    }
    catch (e) {
      this.log("Error logging into azure");
      throw e; // Let Serverless Framework communicate the error
    }
  }
}
