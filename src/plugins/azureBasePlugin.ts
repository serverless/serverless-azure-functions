import { Guard } from "../shared/guard";
import Serverless from "serverless";

export abstract class AzureBasePlugin {
  public constructor(
    protected serverless: Serverless,
  ) {
    Guard.null(serverless);
  }

  protected log(message: string) {
    this.serverless.cli.log(message);
  }
}
