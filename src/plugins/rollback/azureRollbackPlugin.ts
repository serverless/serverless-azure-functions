import Serverless from "serverless";
import { RollbackService } from "../../services/rollbackService";

/**
 * Plugin for rolling back Function App Service to previous deployment
 */
export class AzureRollbackPlugin {
  public hooks: { [eventName: string]: Promise<any> };

  public constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      "rollback:rollback": this.rollback.bind(this)
    };
  }

  private async rollback() {
    const service = new RollbackService(this.serverless, this.options);
    await service.rollback();
  }
}
