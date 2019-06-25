import { BaseService } from "./baseService"
import Serverless from "serverless";
import config from "../config";
import request from "request";

let functionAppName;
let functionsAdminKey;

export class InvokeService extends BaseService {
    public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);

  }

  public invoke(){
    /* accesses the admin key */
    this.getAdminKey();

  }
  
  public invokefunction(functionName, eventType, eventData): Promise<any> {
    if (eventType === "http") {
      let queryString = "";

      if (eventData) {
        if (typeof eventData === "string") {
          try {
            eventData = JSON.parse(eventData);
          }
          catch (error) {
            return Promise.reject("The specified input data isn't a valid JSON string. " +
              "Please correct it and try invoking the function again.");
          }
        }

        queryString = Object.keys(eventData)
          .map((key) => `${key}=${eventData[key]}`)
          .join("&");
      }

      return new Promise((resolve, reject) => {
        const options = {
          headers: {
            "x-functions-key": functionsAdminKey
          },
          url: `http://${functionAppName}${config.functionAppDomain}${config.functionAppApiPath + functionName}?${queryString}`,
          method: "GET",
          json: true,
        };

        this.serverless.cli.log(`Invoking function "${functionName}"`);
        request(options, (err, response, body) => {
          if (err) return reject(err);
          if (response.statusCode !== 200) return reject(body);

          console.log(body);

          resolve(body);
        });
      });
    }

    const requestUrl = `https://${functionAppName}${config.functionAppDomain}${config.functionsAdminApiPath}${functionName}`;

    const options = {
      host: config.functionAppDomain,
      method: "post",
      body: eventData,
      url: requestUrl,
      json: true,
      headers: {
        "x-functions-key": functionsAdminKey,
        Accept: "application/json,*/*"
      }
    };

    return new Promise((resolve, reject) => {
      request(options, (err, res) => {
        if (err) {
          reject(err);
        }
        this.serverless.cli.log(`Invoked function at: ${requestUrl}. \nResponse statuscode: ${res.statusCode}`);
        resolve(res);
      });
    });
  }

  public getAdminKey(): Promise<any> {
    functionAppName = this.serviceName;
    const options = {
      url: `https://${functionAppName}${config.scmDomain}${config.masterKeyApiPath}`,
      json: true,
      headers: {
        Authorization: config.bearer + this.credentials.tokenCache._entries[0].accessToken
      }
    };
    this.serverless.cli.log(JSON.stringify(options.url));


    return new Promise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(body);

        functionsAdminKey = body.masterKey;

        resolve(body.masterKey);
      });
    });
  }
} 