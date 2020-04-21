import { BaseService } from "./baseService"
import Serverless from "serverless";
import axios from "axios";
import { FunctionAppService } from "./functionAppService";
import { configConstants } from "../config/constants";
import { ApimResource } from "../armTemplates/resources/apim";
import { stringify } from "querystring"

export enum InvokeMode {
  FUNCTION,
  LOCAL,
  APIM,
}

export class InvokeService extends BaseService {
  public functionAppService: FunctionAppService;
  private mode: InvokeMode;

  public constructor(serverless: Serverless, options: Serverless.Options, mode: InvokeMode = InvokeMode.FUNCTION) {
    const local = mode === InvokeMode.LOCAL;
    super(serverless, options, !local);
    this.mode = mode;
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
      this.log(`Function ${functionName} does not exist`);
      return;
    }

    const eventType = Object.keys(functionObject["events"][0])[0];

    if (eventType !== "http") {
      this.log("Needs to be an http function");
      return;
    }

    let url = await this.getUrl(functionName);
    if (method === "GET" && data) {
      url += `?${this.getQueryString(data)}`;
    }

    const options = await this.getRequestOptions(method, data);
    this.log(`Invocation url: ${url}`);
    this.log(`Invoking function ${functionName} with ${method} request`);
    return await axios(url, options,);
  }

  private async getUrl(functionName: string) {
    if (this.mode === InvokeMode.LOCAL || this.mode === InvokeMode.APIM) {
      return `${this.getHost()}/api/${this.getConfiguredFunctionRoute(functionName)}`
    }
    const functionApp = await this.functionAppService.get();
    const functionConfig = await this.functionAppService.getFunction(functionApp, functionName);
    const httpConfig = this.functionAppService.getFunctionHttpTriggerConfig(functionApp, functionConfig);
    return "http://" + httpConfig.url;
  }

  private getLocalHost() {
    return `http://localhost:${this.getOption("port", configConstants.defaults.localPort)}`
  }

  private getApimHost() {
    return `https://${ApimResource.getResourceName(this.config)}.azure-api.net`
  }

  private getConfiguredFunctionRoute(functionName: string) {
    try {
      const { route } = this.config.functions[functionName].events[0];
      return route || functionName
    } catch {
      return functionName;
    }
  }

  private getQueryString(eventData: any): string {
    if (typeof eventData === "string") {
      try {
        eventData = JSON.parse(eventData);
      }
      catch (error) {
        throw new Error("The specified input data isn't a valid JSON string. " +
        "Please correct it and try invoking the function again.");
      }
    }
    return stringify(eventData);
  }

  /**
   * Get options object
   * @param method The method used (POST or GET)
   * @param data Data to use as body or query params
   */
  private async getRequestOptions(method: string, data?: any) {
    const host = (this.mode === InvokeMode.LOCAL) ? this.getLocalHost() 
      : (this.mode === InvokeMode.APIM) ? this.getApimHost() 
        : await this.functionAppService.get();
    const options: any = {
      host,
      method,
      data,
    };

    if (this.mode !== InvokeMode.LOCAL) {
      options.headers = {
        "x-functions-key": await this.functionAppService.getMasterKey(),
      }
    }

    return options;
  }

  private getHost() {
    if (this.mode === InvokeMode.LOCAL) {
      return this.getLocalHost();
    } else if (this.mode === InvokeMode.APIM) {
      return this.getApimHost();
    }
  }
}
