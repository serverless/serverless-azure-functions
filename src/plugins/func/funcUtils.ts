import yaml from "js-yaml";
import Serverless from "serverless";
import httpBinding from "./bindingTemplates/http.json"

export class FuncPluginUtils {

  public static getServerlessYml(sls: Serverless) {
    return sls.utils.readFileSync("serverless.yml");
  }

  public static getFunctionsYml(sls: Serverless, serverlessYml?: any) {
    serverlessYml = serverlessYml || FuncPluginUtils.getServerlessYml(sls);
    return serverlessYml["functions"];
  }

  public static updateFunctionsYml(sls: Serverless, functionYml: any, serverlessYml?: any) {
    serverlessYml = serverlessYml || FuncPluginUtils.getServerlessYml(sls);
    serverlessYml["functions"] = functionYml;
    sls.utils.writeFileSync("serverless.yml", yaml.dump(serverlessYml));
  }

  public static getFunctionHandler(name: string) {
    return `"use strict";

module.exports.handler = async function (context, req) {
  context.log("JavaScript HTTP trigger function processed a request.");

  if (req.query.name || (req.body && req.body.name)) {
    context.res = {
      // status: 200, /* Defaults to 200 */
      body: "${name} " + (req.query.name || req.body.name)
    };
  }
  else {
    context.res = {
      status: 400,
      body: "Please pass a name on the query string or in the request body"
    };
  }
};`
  }

  public static getFunctionJsonString(name: string, options: any) {
    // TODO: This is where we would just generate function JSON from SLS object
    // using getFunctionSlsObject(name, options). Currently defaulting to http in and out
    return JSON.stringify(httpBinding, null, 2);
  }

  public static getFunctionSlsObject(name: string, options: any) {
    return FuncPluginUtils.defaultFunctionSlsObject(name);
  }

  private static defaultFunctionSlsObject(name: string) {
    return {
      handler: `src/handlers/${name}.handler`,
      events: FuncPluginUtils.httpEvents()
    }
  }

  private static httpEvents() {
    return [
      {
        http: true,
        "x-azure-settings": {
          authLevel: "anonymous"
        }
      },
      {
        http: true,
        "x-azure-settings": {
          direction: "out",
          name: "res"
        }
      },
    ]
  }
}