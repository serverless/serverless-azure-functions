import Serverless from "serverless";
import { RollbackService } from "../../services/rollbackService";
import { AzureBasePlugin } from "../azureBasePlugin";

/**
 * Plugin for rolling back Function App Service to previous deployment
 */
export class AzureRollbackPlugin extends AzureBasePlugin {

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);

    this.commands = {
      rollback: {
        usage: "Rollback command",
        lifecycleEvents: [
          "rollback"
        ],
        options: {
          timestamp: {
            usage: "Timestamp of previous deployment",
            shortcut: "t",
          },
          resourceGroup: {
            usage: "Resource group for the service",
            shortcut: "g",
          },
          stage: {
            usage: "Stage of service",
            shortcut: "s"
          },
          region: {
            usage: "Region of service",
            shortcut: "r"
          },
          subscriptionId: {
            usage: "Sets the Azure subscription ID",
            shortcut: "i",
          },
        }
      }
    }

    this.hooks = {
      "rollback:rollback": this.rollback.bind(this)
    };
  }

  private async rollback() {
    const service = new RollbackService(this.serverless, this.options);
    await service.rollback();
  }
}
