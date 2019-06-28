import { BaseService } from "./baseService"
import Serverless from "serverless";
import config from "../config";
import axios from "axios";
import { FunctionAppService } from "./functionAppService";

export class InvokeService extends BaseService {
  public functionAppService: FunctionAppService;
  public serverless: Serverless;
  public options: Serverless.Options;
  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
    this.functionAppService = new FunctionAppService(serverless, options);
    this.serverless = serverless;
    this.options = options;
  }

  /**
   * Invoke an Azure Function
   * @param functionName Name of function to invoke
   * @param data Data to use as body or query params
   * @param method GET or POST
   */
  public async invoke(functionName: string, data: any, method: string){
    /* accesses the admin key */
    if (!(functionName in this.slsFunctions())) {
      this.serverless.cli.log(`Function ${functionName} does not exist`);
      return;
    }
    const functionObject = this.slsFunctions()[functionName];
    const eventType = Object.keys(functionObject["events"][0])[0];
    if (eventType !== "http") {
      this.log("Needs to be an http function");
      return;
    }
    let url = `http://${this.serviceName}${config.functionAppDomain}${config.functionAppApiPath + functionName}`;

    if (method === "GET") {
      const queryString = this.getQueryString(data);
      url += `?${queryString}`
    }

    this.log(url);
    const options = await this.getOptions(method, data);
    this.log(`Invoking function ${functionName} with ${method} request`);
    return await axios(url, options);
  }

  private getQueryString(eventData: any) {
    if (typeof eventData === "string") {
      try {
        eventData = JSON.parse(eventData);
      }
      catch (error) {
        return Promise.reject("The specified input data isn't a valid JSON string. " +
          "Please correct it and try invoking the function again.");
      }
    }
    return Object.keys(eventData)
      .map((key) => `${key}=${eventData[key]}`)
      .join("&");
  }

  /**
   * Get options object  
   * @param method The method used (POST or GET)
   * @param data Data to use as body or query params
   */
  private async getOptions(method: string, data?: any) {
    const functionsAdminKey = await this.functionAppService.getMasterKey();
    this.log(functionsAdminKey);
    const options: any = {
      host: config.functionAppDomain,
      headers: {
        "x-functions-key": functionsAdminKey
      },
      method,
    };
    if (method === "POST" && data) {
      options.body = data;
    }
    return options;
  }
} 