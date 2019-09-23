import yaml from "js-yaml";
import rimraf from "rimraf";
import Serverless from "serverless";
import { BaseService } from "./baseService";
import fs from "fs";

export class FuncService extends BaseService {
  public constructor(serverless: Serverless, options: Serverless.Options){
    super(serverless, options, false);
  }

  public add() {
    const functionName = this.options["name"];
    if (!functionName) {
      this.log("Need to provide a name of function to add");
      return;
    }
    if (this.exists(functionName)) {
      this.serverless.cli.log(`Function ${functionName} already exists`);
      return;
    }
    this.createHandler(functionName);
    this.addToServerlessYml(functionName);
  }

  public remove() {
    const functionName = this.options["name"];
    if (!functionName) {
      this.log("Need to provide a name of function to remove");
      return;
    }
    if (!this.exists(functionName)) {
      this.log(`Function ${functionName} does not exist`);
      return;
    }
    const fileName = `${functionName}.js`;
    if (fs.existsSync(fileName)) {
      fs.unlinkSync(fileName);
    }
    if (fs.existsSync(functionName)) {
      rimraf.sync(functionName);
    }
    this.removeFromServerlessYml(functionName);
  }

  private exists(functionName: string) {
    return (functionName in this.configService.getFunctionConfig());
  }

  private createHandler(functionName: string) {
    this.serverless.utils.writeFileSync(`./${functionName}.js`, this.getFunctionHandler(functionName))
  }

  private addToServerlessYml(functionName: string) {
    const functions = this.configService.getFunctionConfig();
    functions[functionName] = this.getFunctionSlsObject(functionName)
    this.updateFunctionsYml(functions)
  }

  private removeFromServerlessYml(functionName: string) {
    const functions = this.configService.getFunctionConfig();
    delete functions[functionName];
    this.updateFunctionsYml(functions)
  }

  private getServerlessYml() {
    return this.serverless.utils.readFileSync(this.configService.getConfigFile());
  }

  private updateFunctionsYml(functionYml: any) {
    const serverlessYml = this.getServerlessYml();
    serverlessYml["functions"] = functionYml;
    this.serverless.utils.writeFileSync(
      this.configService.getConfigFile(),
      yaml.dump(serverlessYml)
    );
  }

  private getFunctionHandler(name: string) {
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

  private getFunctionSlsObject(name: string) {
    return this.defaultFunctionSlsObject(name);
  }

  private defaultFunctionSlsObject(name: string) {
    return {
      handler: `${name}.handler`,
      events: this.httpEvents()
    }
  }

  private httpEvents() {
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