import Serverless from "serverless";
import { RollbackService } from "../../services/rollbackService";
import { AzureBasePlugin } from "../azureBasePlugin";
import { constants } from "../../shared/constants";

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
          ...constants.deployedServiceOptions
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
