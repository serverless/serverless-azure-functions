import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { Utils } from "../../shared/utils";

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
    const filePath = path.resolve(process.cwd(), "src", "plugins", "func", "funcHandler.txt")
    return Utils.interpolateFile(filePath, new Map([
      ["name", name]
    ]));
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