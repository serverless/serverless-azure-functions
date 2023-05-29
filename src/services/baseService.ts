import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import axios from "axios";
import fs from "fs";
import request from "request";
import Serverless from "serverless";
import { StorageAccountResource } from "../armTemplates/resources/storageAccount";
import { CliCommandFactory } from "../config/cliCommandFactory";
import { ServerlessAzureConfig, ServerlessAzureOptions } from "../models/serverless";
import { constants } from "../shared/constants";
import { Guard } from "../shared/guard";
import { Utils } from "../shared/utils";
import { ConfigService } from "./configService";
import { LoggingService, LogLevel } from "./loggingService";

export abstract class BaseService {
  protected baseUrl: string;
  protected serviceName: string;
  protected credentials: TokenCredentialsBase;
  protected subscriptionId: string;
  protected resourceGroup: string;
  protected deploymentName: string;
  protected artifactName: string;
  protected storageAccountName: string;
  protected config: ServerlessAzureConfig;
  protected configService: ConfigService;
  protected loggingService: LoggingService;
  protected cliCommandFactory: CliCommandFactory

  protected constructor(
    protected serverless: Serverless,
    protected options: ServerlessAzureOptions = { stage: null, region: null },
    authenticate = true
  ) {
    Guard.null(serverless);
    this.configService = new ConfigService(serverless, options);
    this.loggingService = new LoggingService(serverless, options);
    this.cliCommandFactory = new CliCommandFactory();

    this.config = this.configService.getConfig();

    this.baseUrl = "https://management.azure.com";
    this.serviceName = this.configService.getServiceName();
    this.credentials = serverless.variables[constants.variableKeys.azureCredentials];
    this.subscriptionId = this.configService.getSubscriptionId();
    this.resourceGroup = this.configService.getResourceGroupName();
    this.deploymentName = this.configService.getDeploymentName();
    this.artifactName = this.configService.getArtifactName(this.deploymentName);
    this.storageAccountName = StorageAccountResource.getResourceName(this.config);

    if (!this.credentials && authenticate) {
      throw new Error(`Azure Credentials has not been set in ${this.constructor.name}`);
    }
  }

  /**
   * Get the access token from credentials token cache
   */
  protected async getAccessToken(): Promise<string> {
    const token = await this.credentials.getToken();
    return token ? token.accessToken : null;
  }

  /**
   * Sends an API request using axios HTTP library
   * @param method The HTTP method
   * @param relativeUrl The relative url
   * @param options Additional HTTP options including headers, etc.
   */
  protected async sendApiRequest(
    method: string,
    relativeUrl: string,
    options: any = {}
  ) {
    const defaultHeaders = {
      Authorization: `Bearer ${await this.getAccessToken()}`
    };

    const allHeaders = {
      ...defaultHeaders,
      ...options.headers
    };

    const requestOptions = {
      ...options,
      method,
      headers: allHeaders
    };

    return await axios(relativeUrl, requestOptions);
  }

  /**
   * Uploads the specified file via HTTP request
   * @param requestOptions The HTTP request options
   * @param filePath The local file path
   */
  protected sendFile(requestOptions, filePath) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath).pipe(
        request(requestOptions, (err, response) => {
          if (err) {
            this.log(this.stringify(err));
            return reject(err);
          }
          resolve(response);
        })
      );
    });
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

  protected prettyPrint(object: any) {
    this.log(this.stringify(object));
  }

  protected stringify(object: any): string {
    return JSON.stringify(object, null, 2);
  }

  protected getOption(key: string, defaultValue?: any) {
    return Utils.get(this.options, key, defaultValue);
  }
}
