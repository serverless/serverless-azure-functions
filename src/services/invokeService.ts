import { BaseService } from "./baseService"
import Serverless from "serverless";
import axios from "axios";
import { FunctionAppService } from "./functionAppService";

export class InvokeService extends BaseService {
  public functionAppService: FunctionAppService;

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
    this.functionAppService = new FunctionAppService(serverless, options);
  }

  /**
   * Invoke an Azure Function
   * @param method HTTP method
   * @param functionName Name of function to invoke
   * @param data Data to use as body or query params
   */
  public async invoke(method: string, functionName: string, data?: any){

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
    
    const functionApp = await this.functionAppService.get();
    const functionConfig = await this.functionAppService.getFunction(functionApp, functionName);
    const httpConfig = this.functionAppService.getFunctionHttpTriggerConfig(functionApp, functionConfig);
    let url  = "http://" + httpConfig.url;

    if (method === "GET" && data) {
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
    const functionApp = await this.functionAppService.get();
    const options: any = {
      host: functionApp.defaultHostName,
      headers: {
        "x-functions-key": functionsAdminKey
      },
      method,
      data,
    };
    
    return options;
  }
} 