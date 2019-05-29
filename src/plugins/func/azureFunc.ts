import fs from "fs";
import path from "path";
import rimraf from "rimraf";
import Serverless from "serverless";
import { FuncPluginUtils } from "./funcUtils";

export class AzureFuncPlugin {
  public hooks: { [eventName: string]: Promise<any> };
  public commands: any;
  

  public constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      "func:func": this.func.bind(this),
      "func:add:add": this.add.bind(this),
      "func:remove:remove": this.remove.bind(this)
    };

    this.commands = {
      func: {
        usage: "Add or remove functions",
        lifecycleEvents: [
          "func",
        ],
        commands: {
          add: {
            usage: "Add azure function",
            lifecycleEvents: [
              "add",
            ],
            options: {
              name: {
                usage: "Name of function to add",
                shortcut: "n",
              }
            }
          },
          remove: {
            usage: "Remove azure function",
            lifecycleEvents: [
              "remove",
            ],
            options: {
              name: {
                usage: "Name of function to remove",
                shortcut: "n",
              }
            }
          }
        }
      }
    }
  }

  private async func() {
    this.serverless.cli.log("Use the func plugin to add or remove functions within Function App");
  }

  private async add() {
    if (!("name" in this.options)) {
      this.serverless.cli.log("Need to provide a name of function to add");
      return;
    }
    const funcToAdd = this.options["name"]
    const exists = fs.existsSync(funcToAdd);
    if (exists) {
      this.serverless.cli.log(`Function ${funcToAdd} already exists`);
      return;
    }
    this.createFunctionDir(funcToAdd);
    this.addToServerlessYml(funcToAdd);
  }

  private createFunctionDir(name: string) {
    this.serverless.cli.log("Creating function dir");
    fs.mkdirSync(name);
    fs.writeFileSync(path.join(name, "index.js"), FuncPluginUtils.getFunctionHandler(name));
    fs.writeFileSync(path.join(name, "function.json"), FuncPluginUtils.getFunctionJson(name, this.options))
  }

  private addToServerlessYml(name: string) {
    this.serverless.cli.log("Adding to serverless.yml");
    const functionYml = FuncPluginUtils.getFunctionsYml();
    functionYml.functions[name] = FuncPluginUtils.getFunctionSlsObject(name, this.options);
    FuncPluginUtils.updateFunctionsYml(functionYml);
  } 

  private async remove() {
    if (!("name" in this.options)) {
      this.serverless.cli.log("Need to provide a name of function to remove");
      return;
    }
    const funcToRemove = this.options["name"];
    const exists = fs.existsSync(funcToRemove);
    if (!exists) {
      this.serverless.cli.log(`Function ${funcToRemove} does not exist`);
      return;
    }
    this.serverless.cli.log(`Removing ${funcToRemove}`);
    rimraf.sync(funcToRemove);
    await this.removeFromServerlessYml(funcToRemove);
  }

  private async removeFromServerlessYml(name: string) {
    const functionYml = FuncPluginUtils.getFunctionsYml();
    delete functionYml.functions[name];
    FuncPluginUtils.updateFunctionsYml(functionYml)
  }
}