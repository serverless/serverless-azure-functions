import Serverless from "serverless";
import axios from "axios";
import request from "request";
import fs from "fs";
import { Guard } from "../shared/guard";

export abstract class BaseService {
  protected baseUrl: string;
  protected serviceName: string;
  protected credentials: any;
  protected subscriptionId: string;
  protected resourceGroup: string;
  protected deploymentName: string;

  protected constructor(protected serverless: Serverless, protected options?: Serverless.Options) {
    Guard.null(serverless);

    this.baseUrl = "https://management.azure.com";
    this.serviceName = serverless.service["service"];
    this.credentials = serverless.variables["azureCredentials"];
    this.subscriptionId = serverless.variables["subscriptionId"];
    this.resourceGroup = serverless.service.provider["resourceGroup"] || `${this.serviceName}-rg`;
    this.deploymentName = serverless.service.provider["deploymentName"] || `${this.resourceGroup}-deployment`;

    if (!this.credentials) {
      throw new Error(`Azure Credentials has not been set in ${this.constructor.name}`);
    }
  }

  protected log(message: string) {
    this.serverless.cli.log(message);
  }
  
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

  protected wait(timeout: number) {
    return new Promise((resolve) => setTimeout(resolve, timeout));
  }

  protected waitForCondition(predicate: () => boolean, interval: number = 2000) {
    return new Promise((resolve, reject) => {
      let retries = 0;
      const id = setInterval(async () => {
        if (retries >= 20) {
          clearInterval(id);
          return reject("Failed conditional check 20 times");
        }

        retries++;
        const result = await predicate();
        if (result) {
          clearInterval(id);
          resolve(result);
        }
      }, interval);
    });
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
}
