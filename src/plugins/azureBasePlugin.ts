import Serverless from "serverless";
import { ServerlessAzureConfig, ServerlessCliCommand,
  ServerlessCommandMap, ServerlessHookMap, ServerlessObject } from "../models/serverless";
import { Guard } from "../shared/guard";
import { Utils } from "../shared/utils";
import { LoggingService, LogLevel } from "../services/loggingService";

export abstract class AzureBasePlugin<TOptions=Serverless.Options> {

  public hooks: ServerlessHookMap
  protected config: ServerlessAzureConfig;
  protected loggingService: LoggingService;
  protected commands: ServerlessCommandMap;
  protected processedCommands: ServerlessCliCommand[];

  public constructor(
    protected serverless: Serverless,
    protected options: TOptions,
  ) {
    Guard.null(serverless);
    this.config = serverless.service as any;
    this.loggingService = new LoggingService(serverless, options as any);
    this.processedCommands = (serverless as any as ServerlessObject).processedInput.commands;
  }

  /**
   * Log message to Serverless CLI
   * @param message Message to log
   */
  protected log(message: string, logLevel?: LogLevel) {
    this.loggingService.log(message, logLevel);
  }

  /**
   * Log error message to Serverless CLI
   * @param message Error message to log
   */
  protected error(message: string) {
    this.loggingService.error(message);
  }

  /**
   * Log warning message to Serverless CLI
   * @param message Warning message to log
   */
  protected warn(message: string) {
    this.loggingService.warn(message);
  }

  /**
   * Log info message to Serverless CLI
   * @param message Info message to log
   */
  protected info(message: string) {
    this.loggingService.info(message);
  }

  /**
   * Log debug message to Serverless CLI
   * @param message Debug message to log
   */
  protected debug(message: string) {
    this.loggingService.debug(message);
  }

  protected getOption(key: string, defaultValue?: any): string {
    return Utils.get(this.options, key, defaultValue);
  }
}
