import axios from "axios";
import fs from "fs";
import request from "request";
import Serverless from "serverless";
import { Guard } from "../shared/guard";
import { ServerlessAzureConfig } from "../models/serverless";

export abstract class BaseService {
  protected baseUrl: string;
  protected serviceName: string;
  protected credentials: any;
  protected subscriptionId: string;
  protected resourceGroup: string;
  protected deploymentName: string;
  protected deploymentContainerName: string;
  protected storageAccountName: string;
  protected config: ServerlessAzureConfig;

  protected constructor(
    protected serverless: Serverless,
    protected options: Serverless.Options = { stage: null, region: null },
    authenticate: boolean = true,
  ) {
    Guard.null(serverless);

    this.setDefaultValues();

    this.baseUrl = "https://management.azure.com";
    this.config = serverless.service as any;
    this.serviceName = serverless.service["service"];
    this.credentials = serverless.variables["azureCredentials"];
    this.subscriptionId = serverless.variables["subscriptionId"];
    this.resourceGroup = this.getResourceGroupName();
    this.deploymentName = serverless.service.provider["deploymentName"] || `${this.resourceGroup}-deployment`;

    if (!this.credentials && authenticate) {
      throw new Error(`Azure Credentials has not been set in ${this.constructor.name}`);
    }
  }

  public getRegion(): string {
    return this.options.region || this.serverless.service.provider.region;
  }
  
  public getStage(): string {
    return this.options.stage || this.serverless.service.provider.stage;
  }

  public getResourceGroupName(): string {
    return this.options["resourceGroup"]
      || this.serverless.service.provider["resourceGroup"]
      || `${this.config.provider.prefix}-${this.getRegion()}-${this.getStage()}-${this.serviceName}-rg`;
  }

  /**
   * Sends an API request using axios HTTP library
   * @param method The HTTP method
   * @param relativeUrl The relative url
   * @param options Additional HTTP options including headers, etc
   */
  protected async sendApiRequest(method: string, relativeUrl: string, options: any = {}) {
    const defaultHeaders = {
      Authorization: `Bearer ${this.credentials.tokenCache._entries[0].accessToken}`,
    };

    const allHeaders = {
      ...defaultHeaders,
      ...options.headers,
    };

    const requestOptions = {
      ...options,
      method,
      headers: allHeaders,
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
      fs.createReadStream(filePath)
        .pipe(request(requestOptions, (err, response) => {
          if (err) {
            this.log(JSON.stringify(err, null, 4));
            return reject(err);
          }
          resolve(response);
        }));
    });
  }

  protected log(message: string) {
    this.serverless.cli.log(message);
  }

  protected slsFunctions() {
    return this.serverless.service["functions"];
  }

  protected slsConfigFile(): string {
    return ("config" in this.options) ? this.options["config"] : "serverless.yml";
  }

  private setDefaultValues(): void {
    // TODO: Right now the serverless core will always default to AWS default region if the
    // region has not been set in the serverless.yml or CLI options
    const awsDefault = "us-east-1"
    const providerRegion = this.serverless.service.provider.region;

    if (!providerRegion || providerRegion === awsDefault) { // no region specified in serverless.yml
      this.serverless.service.provider.region = "westus";
    }

    if (!this.serverless.service.provider.stage) {
      this.serverless.service.provider.stage = "dev";
    }

    if (!this.serverless.service.provider["prefix"]) {
      this.serverless.service.provider["prefix"] = "sls";
    }
  }
}
