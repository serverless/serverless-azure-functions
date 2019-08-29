import Serverless from "serverless";
import { ServerlessAzureConfig, ServerlessCliCommand,
  ServerlessCommandMap, ServerlessHookMap, ServerlessObject } from "../models/serverless";
import { Guard } from "../shared/guard";
import { Utils } from "../shared/utils";

export abstract class AzureBasePlugin<TOptions=Serverless.Options> {

  public hooks: ServerlessHookMap
  protected config: ServerlessAzureConfig;
  protected commands: ServerlessCommandMap;
  protected processedCommands: ServerlessCliCommand[];

  public constructor(
    protected serverless: Serverless,
    protected options: TOptions,
  ) {
    Guard.null(serverless);
    this.config = serverless.service as any;
    this.processedCommands = (serverless as any as ServerlessObject).processedInput.commands;
  }

  protected log(message: string) {
    this.serverless.cli.log(message);
  }

  protected getOption(key: string, defaultValue?: any): string {
    return Utils.get(this.options, key, defaultValue);
  }
}
