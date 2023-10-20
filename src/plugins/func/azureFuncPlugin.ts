import Serverless from "serverless";
import { FuncService } from "../../services/funcService";
import { AzureBasePlugin } from "../azureBasePlugin";

export class AzureFuncPlugin extends AzureBasePlugin {

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);

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
                type: "string",
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
                type: "string",
              }
            }
          }
        }
      }
    }
  }

  private async func() {
    this.log("Use the func plugin to add or remove functions within Function App");
  }

  private async add() {
    const service = new FuncService(this.serverless, this.options);
    service.add();
  }

  private async remove() {
    const service = new FuncService(this.serverless, this.options);
    service.remove();
  }
}
