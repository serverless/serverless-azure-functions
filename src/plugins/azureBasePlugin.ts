import Serverless from "serverless";
import { ServerlessAzureConfig, ServerlessCliCommand,
  ServerlessCommandMap, ServerlessHookMap, ServerlessObject, FunctionAppOS } from "../models/serverless";
import { Guard } from "../shared/guard";
import { Utils } from "../shared/utils";

export abstract class AzureBasePlugin<TOptions=Serverless.Options> {

  public hooks: ServerlessHookMap
  protected config: ServerlessAzureConfig;
  protected commands: ServerlessCommandMap;
  protected processedCommands: ServerlessCliCommand[];
  /**
   * Specifies if targeted runtime is linux
   */
  protected isLinuxTarget: boolean;

  public constructor(
    protected serverless: Serverless,
    protected options: TOptions,
  ) {
    Guard.null(serverless);
    this.config = serverless.service as any;
    this.processedCommands = (serverless as any as ServerlessObject).processedInput.commands;
    const { provider } = serverless.service
    this.isLinuxTarget = provider["os"] === FunctionAppOS.LINUX ||
      provider.runtime.includes("python");
  }

  protected log(message: string) {
    this.serverless.cli.log(message);
  }

  protected getOption(key: string, defaultValue?: any): string {
    return Utils.get(this.options, key, defaultValue);
  }
}
