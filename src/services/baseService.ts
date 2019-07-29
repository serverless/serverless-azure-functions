import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import axios from "axios";
import fs from "fs";
import request from "request";
import Serverless from "serverless";
import { configConstants } from "../config";
import { ArmResourceType } from "../models/armTemplates";
import {
  DeploymentConfig,
  ServerlessAzureConfig,
  ServerlessAzureFunctionConfig,
  ServerlessAzureOptions,
  ServerlessLogOptions
} from "../models/serverless";
import { Guard } from "../shared/guard";
import { Utils } from "../shared/utils";
import { AzureNamingService } from "./azureNamingService";

export abstract class BaseService {
  protected baseUrl: string;
  protected namingService: AzureNamingService;
  protected serviceName: string;
  protected credentials: TokenCredentialsBase;
  protected subscriptionId: string;
  protected resourceGroup: string;
  protected deploymentName: string;
  protected deploymentConfig: DeploymentConfig;
  protected storageAccountName: string;
  protected config: ServerlessAzureConfig;

  protected constructor(
    protected serverless: Serverless,
    protected options: ServerlessAzureOptions = { stage: null, region: null },
    authenticate: boolean = true
  ) {
    Guard.null(serverless);
    this.baseUrl = "https://management.azure.com";
    this.namingService = new AzureNamingService(this.serverless, this.options);
    this.serviceName = this.namingService.getServiceName();
    this.config = serverless.service as any;
    this.credentials = serverless.variables["azureCredentials"];
    this.subscriptionId = serverless.variables["subscriptionId"];
    this.resourceGroup = this.namingService.getResourceGroupName();
    this.deploymentConfig = this.getDeploymentConfig();
    this.deploymentName = this.namingService.getDeploymentName();
    this.storageAccountName = this.namingService.getResourceName(ArmResourceType.StorageAccount);

    if (!this.credentials && authenticate) {
      throw new Error(
        `Azure Credentials has not been set in ${this.constructor.name}`
      );
    }
  }

  /**
   * Deployment config from `serverless.yml` or default.
   * Defaults can be found in the `config.ts` file
   */
  protected getDeploymentConfig(): DeploymentConfig {
    const providedConfig = this.serverless["deploy"] as DeploymentConfig;
    return {
      ...configConstants.deploymentConfig,
      ...providedConfig,
    }
  }

  /**
   * Get the access token from credentials token cache
   */
  protected getAccessToken(): string {
    return (this.credentials.tokenCache as any)._entries[0].accessToken;
  }

  /**
   * Sends an API request using axios HTTP library
   * @param method The HTTP method
   * @param relativeUrl The relative url
   * @param options Additional HTTP options including headers, etc
   */
  protected async sendApiRequest(
    method: string,
    relativeUrl: string,
    options: any = {}
  ) {
    const defaultHeaders = {
      Authorization: `Bearer ${this.getAccessToken()}`
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
            this.log(JSON.stringify(err, null, 4));
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
  protected log(message: string, options?: ServerlessLogOptions, entity?: string,) {
    (this.serverless.cli.log as any)(message, entity, options);
  }

  /**
   * Get function objects
   */
  protected slsFunctions(): { [functionName: string]: ServerlessAzureFunctionConfig } {
    return this.serverless.service["functions"];
  }

  /**
   * Returns string contents of serverless configuration file
   */
  protected slsConfigFile(): string {
    return "config" in this.options ? this.options["config"] : "serverless.yml";
  }

  protected getOption(key: string, defaultValue?: any) {
    return Utils.get(this.options, key, defaultValue);
  }
}
