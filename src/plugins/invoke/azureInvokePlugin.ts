import fs from "fs";
import { isAbsolute, join } from "path";
import Serverless from "serverless";
import { InvokeService } from "../../services/invokeService";
import { AzureBasePlugin } from "../azureBasePlugin";
import path from "path";

export class AzureInvokePlugin extends AzureBasePlugin {

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);

    this.commands = {
      invoke: {
        usage: "Invoke command",
        lifecycleEvents: ["invoke"],
        options: {
          resourceGroup: {
            usage: "Resource group for the service",
            shortcut: "g",
          },
          stage: {
            usage: "Stage of service",
            shortcut: "s"
          },
          region: {
            usage: "Region of service",
            shortcut: "r"
          },
          subscriptionId: {
            usage: "Sets the Azure subscription ID",
            shortcut: "i",
          },
          function: {
            usage: "Function to call",
            shortcut: "f",
          },
          path: {
            usage: "Path to file to put in body",
            shortcut: "p"
          },
          data: {
            usage: "Data string for body of request",
            shortcut: "d"
          },
          method: {
            usage: "HTTP method (Default is GET)",
            shortcut: "m"
          }
        },
        commands: {
          local: {
            usage: "Invoke a local function",
            options: {
              function: {
                usage: "Function to call",
                shortcut: "f",
              },
              path: {
                usage: "Path to file to put in body",
                shortcut: "p"
              },
              data: {
                usage: "Data string for body of request",
                shortcut: "d"
              },
              method: {
                usage: "HTTP method (Default is GET)",
                shortcut: "m"
              },
              port: {
                usage: "Port through which locally running service is exposed",
                shortcut: "t"
              }
            },
            lifecycleEvents: [ "local" ],
          }
        }
      }
    }

    this.hooks = {
      "invoke:invoke": this.invokeRemote.bind(this),
      "invoke:local:local": this.invokeLocal.bind(this),
    };
  }

  private async invokeRemote() {
    await this.invoke();
  }

  private async invokeLocal() {
    await this.invoke(true);
  }

  private async invoke(local: boolean = false) {
    const functionName = this.options["function"];
    const method = this.options["method"] || "GET";
    if (!functionName) {
      this.log("Need to provide a name of function to invoke");
      return;
    }

    const invokeService = new InvokeService(this.serverless, this.options, local);
    const response = await invokeService.invoke(method, functionName, this.getData());
    if (response) {
      this.log(JSON.stringify(response.data));
    }
  }

  private getData() {
    let dataPath = this.getOption("path");
    if (dataPath) {
      dataPath = (isAbsolute(dataPath)) ? dataPath : path.join(this.serverless.config.servicePath, dataPath);
      if (!fs.existsSync(dataPath)) {
        throw new Error("The file you provided does not exist.");
      }
      return fs.readFileSync(dataPath).toString();
    }
    return this.getOption("data");
  }
}
