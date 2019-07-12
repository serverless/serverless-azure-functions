import Serverless from "serverless";
import { RollbackService } from "../../services/rollbackService";
import { AzureBasePlugin } from "../azureBasePlugin";

/**
 * Plugin for rolling back Function App Service to previous deployment
 */
export class AzureRollbackPlugin extends AzureBasePlugin {
  public hooks: { [eventName: string]: Promise<any> };

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
    this.hooks = {
      "rollback:rollback": this.rollback.bind(this)
    };
  }

  private async rollback() {
    const service = new RollbackService(this.serverless, this.options);
    await service.rollback();
  }
}
