import yaml from "js-yaml";
import fs from "fs";

export class FuncPluginUtils {

  public static getServerlessYml() {
    return yaml.safeLoad(fs.readFileSync("serverless.yml", "utf-8"));
  }

  public static getFunctionsYml(serverlessYml?: any) {
    serverlessYml = serverlessYml || FuncPluginUtils.getServerlessYml();
    return serverlessYml["functions"];
  }

  public static updateFunctionsYml(functionYml: any, serverlessYml?: any) {
    serverlessYml = serverlessYml || FuncPluginUtils.getServerlessYml();
    serverlessYml["functions"] = functionYml;
    fs.writeFileSync("serverless.yml", yaml.dump(serverlessYml));
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
};`;
  }

  public static getFunctionJson(name: string, options: any) {
    // TODO: This is where we would just generate function JSON from SLS object
    // using getFunctionSlsObject(name, options). Currently defaulting to http in and out
    return JSON.stringify({
      "bindings": [
        {
          "authLevel": "anonymous",
          "type": "httpTrigger",
          "direction": "in",
          "name": "req",
          "methods": [
            "get",
            "post"
          ]
        },
        {
          "type": "http",
          "direction": "out",
          "name": "res"
        }
      ]
    });
  }

  public static getFunctionSlsObject(name: string, options: any) {

    return FuncPluginUtils.defaultFunctionSlsObject(name);
  }

  private static defaultFunctionSlsObject(name: string) {
    return {
      handler: `${name}/index.handler`,
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