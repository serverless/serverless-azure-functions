import axios from "axios";
import fs from "fs";
import request from "request";
import Serverless from "serverless";
import { ServerlessAzureOptions } from "../models/serverless";
import { StorageAccountResource } from "../armTemplates/resources/storageAccount";
import { configConstants } from "../config";
import { DeploymentConfig, ServerlessAzureConfig } from "../models/serverless";
import { Guard } from "../shared/guard";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { Utils } from "../shared/utils";

export abstract class BaseService {
  protected baseUrl: string;
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
    this.setDefaultValues();

    this.baseUrl = "https://management.azure.com";
    this.serviceName = this.getServiceName();
    this.config = serverless.service as any;
    this.credentials = serverless.variables["azureCredentials"];
    this.subscriptionId = serverless.variables["subscriptionId"];
    this.resourceGroup = this.getResourceGroupName();
    this.deploymentConfig = this.getDeploymentConfig();
    this.deploymentName = this.getDeploymentName();
    this.storageAccountName = StorageAccountResource.getResourceName(
      serverless.service as any
    );

    if (!this.credentials && authenticate) {
      throw new Error(
        `Azure Credentials has not been set in ${this.constructor.name}`
      );
    }
  }

  /**
   * Name of Azure Region for deployment
   */
  public getRegion(): string {
    return this.options.region || this.config.provider.region;
  }

  /**
   * Name of current deployment stage
   */
  public getStage(): string {
    return this.options.stage || this.config.provider.stage;
  }

  public getPrefix(): string {
    return this.config.provider.prefix;
  }

  /**
   * Name of current resource group
   */
  public getResourceGroupName(): string {
    const regionName = Utils.createShortAzureRegionName(this.getRegion());
    const stageName = Utils.createShortStageName(this.getStage());

    return this.options.resourceGroup
      || this.config.provider.resourceGroup
      || `${this.getPrefix()}-${regionName}-${stageName}-${this.serviceName}-rg`;
  }

  /**
   * Deployment config from `serverless.yml` or default.
   * Defaults can be found in the `config.ts` file
   */
  public getDeploymentConfig(): DeploymentConfig {
    const providedConfig = this.serverless["deploy"] as DeploymentConfig;
    return {
      ...configConstants.deploymentConfig,
      ...providedConfig,
    }
  }

  /**
   * Name of current ARM deployment
   */
  public getDeploymentName(): string {
    const name = this.config.provider.deploymentName || `${this.resourceGroup}-deployment`;
    return this.rollbackConfiguredName(name);
  }

  /**
   * Name of Function App Service
   */
  public getServiceName(): string {
    return this.serverless.service["service"];
  }

  /**
   * Get rollback-configured artifact name. Contains `-t{timestamp}`
   * Takes name of deployment and replaces `rg-deployment` or `deployment` with `artifact`
   */
  protected getArtifactName(deploymentName: string): string {
    return `${deploymentName
      .replace("rg-deployment", "artifact")
      .replace("deployment", "artifact")}.zip`;
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
  protected log(message: string) {
    this.serverless.cli.log(message);
  }

  /**
   * Get function objects
   */
  protected slsFunctions() {
    return this.serverless.service["functions"];
  }

  protected slsConfigFile(): string {
    return "config" in this.options ? this.options["config"] : "serverless.yml";
  }

  private setDefaultValues(): void {
    // TODO: Right now the serverless core will always default to AWS default region if the
    // region has not been set in the serverless.yml or CLI options
    const awsDefault = "us-east-1";
    const providerRegion = this.serverless.service.provider.region;

    if (!providerRegion || providerRegion === awsDefault) {
      // no region specified in serverless.yml
      this.serverless.service.provider.region = "westus";
    }

    if (!this.serverless.service.provider.stage) {
      this.serverless.service.provider.stage = "dev";
    }

    if (!this.serverless.service.provider["prefix"]) {
      this.serverless.service.provider["prefix"] = "sls";
    }
  }

  /**
   * Add `-t{timestamp}` if rollback is enabled
   * @param name Original name
   */
  private rollbackConfiguredName(name: string) {
    return this.deploymentConfig.rollback
      ? `${name}-t${this.getTimestamp()}`
      : name;
  }

  /**
   * Get timestamp from `packageTimestamp` serverless variable
   * If not set, create timestamp, set variable and return timestamp
   */
  private getTimestamp(): number {
    let timestamp = +this.serverless.variables["packageTimestamp"];
    if (!timestamp) {
      timestamp = Date.now();
      this.serverless.variables["packageTimestamp"] = timestamp;
    }
    return timestamp;
  }
}
