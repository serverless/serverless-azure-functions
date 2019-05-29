import fs from "fs";
import rimraf from "rimraf";
import Serverless from "serverless";
import { FuncPluginUtils } from "../funcUtils";

export class AzureFuncRemovePlugin {
  public hooks: { [eventName: string]: Promise<any> };
  public commands: any;

  constructor(private serverless: Serverless, private options: Serverless.Options) {

    this.commands = {
      func: {
        commands: {
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

    this.hooks = {
      "func:remove:remove": this.remove.bind(this)
    };
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