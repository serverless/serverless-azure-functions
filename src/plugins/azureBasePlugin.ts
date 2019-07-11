import { Guard } from "../shared/guard";
import Serverless from "serverless";
import { Utils } from "../shared/utils";

export abstract class AzureBasePlugin {
  public constructor(
    protected serverless: Serverless,
    protected options: Serverless.Options,
  ) {
    Guard.null(serverless);
  }

  protected log(message: string) {
    this.serverless.cli.log(message);
  }

  protected getOption(key: string, defaultValue?: any): string {
    return Utils.get(this.options, key, defaultValue);
  }
}
