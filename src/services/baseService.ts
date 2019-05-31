import axios from "axios";
import fs from "fs";
import request from "request";
import Serverless from "serverless";
import { Guard } from "../shared/guard";

export abstract class BaseService {
  protected baseUrl: string;
  protected serviceName: string;
  protected credentials: any;
  protected subscriptionId: string;
  protected resourceGroup: string;
  protected deploymentName: string;

  protected constructor(protected serverless: Serverless, protected options?: Serverless.Options, authenticate = true) {
    Guard.null(serverless);
    this.setDefaultRegion();

    this.baseUrl = "https://management.azure.com";
    this.serviceName = serverless.service["service"];
    this.credentials = serverless.variables["azureCredentials"];
    this.subscriptionId = serverless.variables["subscriptionId"];
    this.resourceGroup = this.getResourceGroupName(this.serviceName);
    this.deploymentName = serverless.service.provider["deploymentName"] || `${this.resourceGroup}-deployment`;

    if (!this.credentials && authenticate) {
      throw new Error(`Azure Credentials has not been set in ${this.constructor.name}`);
    }
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
  
  /**
   * normallize provider object b/c serverless set an incorrect region default
   * that use AWS syntax
   */
  private setDefaultRegion(): void {
    const defaultRegion = 'westus2';

    const awsDefault = "us-east-1"
    const providerRegion = this.serverless.service.provider.region;
    if (providerRegion === awsDefault) { // no region specified in serverless.yml
      this.serverless.service.provider.region = defaultRegion;
    }
  }

  protected getRegion(): string {
    return this.options.region || this.serverless.service.provider.region;
  }

  private getStage(): string {
    const defaultStage = 'dev';
    return this.options.stage || this.serverless.service.provider.stage || defaultStage;
  }

  private getResourceGroupName(serviceName: string): string {
    const name = `${serviceName}-${this.getStage()}-${this.getRegion()}-rg`;
    this.serverless.cli.log(`Resource GROUP: ${name}`);
    return name;
  }
}
