import { BaseService } from "./baseService"
import Serverless from "serverless";
import axios from "axios";
import { FunctionAppService } from "./functionAppService";
import configConstants from "../config";

export class InvokeService extends BaseService {
  public functionAppService: FunctionAppService;
  private local: boolean;

  public constructor(serverless: Serverless, options: Serverless.Options, local: boolean = false) {
    super(serverless, options, !local);
    this.local = local;
    if (!local) {
      this.functionAppService = new FunctionAppService(serverless, options);
    }
  }

  /**
   * Invoke an Azure Function
   * @param method HTTP method
   * @param functionName Name of function to invoke
   * @param data Data to use as body or query params
   */
  public async invoke(method: string, functionName: string, data?: any){

    const functionObject = this.configService.getFunctionConfig()[functionName];
    /* accesses the admin key */
    if (!functionObject) {
      this.serverless.cli.log(`Function ${functionName} does not exist`);
      return;
    }

    const eventType = Object.keys(functionObject["events"][0])[0];

    if (eventType !== "http") {
      this.log("Needs to be an http function");
      return;
    }

    let url = await this.getUrl(functionName);

    if (method === "GET" && data) {
      const queryString = this.getQueryString(data);
      url += `?${queryString}`
    }

    this.log(`URL for invocation: ${url}`);

    const options = await this.getRequestOptions(method, data);
    this.log(`Invoking function ${functionName} with ${method} request`);
    return await axios(url, options);
  }

  private async getUrl(functionName: string) {
    if (this.local) {
      return `${this.getLocalHost()}/api/${this.getConfiguredFunctionRoute(functionName)}`
    }
    const functionApp = await this.functionAppService.get();
    const functionConfig = await this.functionAppService.getFunction(functionApp, functionName);
    const httpConfig = this.functionAppService.getFunctionHttpTriggerConfig(functionApp, functionConfig);
    return "http://" + httpConfig.url;
  }

  private getLocalHost() {
    return `http://localhost:${this.getOption("port", configConstants.defaults.localPort)}`
  }

  private getConfiguredFunctionRoute(functionName: string) {
    try {
      const { route } = this.config.functions[functionName].events[0]["x-azure-settings"];
      return route || functionName
    } catch {
      return functionName;
    }
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
    return encodeURIComponent(Object.keys(eventData)
      .map((key) => `${key}=${eventData[key]}`)
      .join("&"));
  }

  /**
   * Get options object
   * @param method The method used (POST or GET)
   * @param data Data to use as body or query params
   */
  private async getRequestOptions(method: string, data?: any) {
    const host = (this.local) ? this.getLocalHost() : await this.functionAppService.get();
    const options: any = {
      host,
      method,
      data,
    };

    if (!this.local) {
      options.headers = {
        "x-functions-key": await this.functionAppService.getMasterKey(),
      }
    }

    return options;
  }
}
