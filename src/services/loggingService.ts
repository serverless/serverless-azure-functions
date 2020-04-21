import Serverless from "serverless";
import { ServerlessAzureOptions } from "../models/serverless";
import { Utils } from "../shared/utils";

/**
 * Log Level for service, in order from least verbose to most
 */
export enum LogLevel {
  /** Only log error messages */
  ERROR = 1,
  /** Only log warnings and error messages */
  WARN = 2,
  /** Only log info, warnings and error messages */
  INFO = 3,
  /** Log everything */
  DEBUG = 4
}

export class LoggingService {
  /** Logging level for service. Specified by 'verbose' or 'v' flag in Serverless Options.
   * Defaults to 'info' */
  private logLevel: LogLevel;

  public constructor(private serverless: Serverless, private options: ServerlessAzureOptions) {
    
    // Check for 'verbose' or 'v'. Would use the sls shortcuts at the plugin level, 
    // but this will be utilized across the plugins, so we check for both
    const logLevelStr = Utils.get(options, "verbose");

    this.logLevel = (logLevelStr !== undefined) ? Utils.get({
      "error": LogLevel.ERROR,
      "warn": LogLevel.WARN,
      "info": LogLevel.INFO,
      "debug": LogLevel.DEBUG,
      "": LogLevel.DEBUG
    }, logLevelStr.toLowerCase()) : LogLevel.INFO;
  }

  /**
   * Logs any message with a level (error, warn, info, debug) less than or equal
   * to the logging level set in the constructor (defaults to info)
   * @param message Message to log
   * @param logLevel Log Level
   */
  public log(message: string, logLevel: LogLevel = LogLevel.INFO) {
    if (logLevel <= this.logLevel) {
      this.serverless.cli.log(message);
    }
  }

  /**
   * Log an error message with prefix '[ERROR] '
   * @param message Error message
   */
  public error(message: string) {
    this.log(`[ERROR] ${message}`, LogLevel.ERROR);
  }

  /**
   * Log a warning message with prefix '[WARN] '
   * @param message Warning message
   */
  public warn(message: string) {
    this.log(`[WARN] ${message}`, LogLevel.WARN);
  }
  
  /**
   * Log an info message. Does not include any prefix, as info is default behavior
   * @param message Info message
   */
  public info(message: string) {
    this.log(message, LogLevel.INFO);
  }

  /**
   * Log a debug message prefix '[DEBUG] '
   * @param message Debug message
   */
  public debug(message: string) {
    this.log(`[DEBUG] ${message}`, LogLevel.DEBUG);
  }
}
