import fs from "fs";
import { isAbsolute, join } from "path";
import Serverless from "serverless";
import { InvokeService } from "../../services/invokeService";
import { AzureBasePlugin } from "../azureBasePlugin";

export class AzureInvokePlugin extends AzureBasePlugin {

  private invokeService: InvokeService;

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
    const path = this.options["path"];

    if (path) {
      const absolutePath = isAbsolute(path)
        ? path
        : join(this.serverless.config.servicePath, path);
      this.log(this.serverless.config.servicePath);
      this.log(path);

      if (!fs.existsSync(absolutePath)) {
        throw new Error("The file you provided does not exist.");
      }
      this.options["data"] = fs.readFileSync(absolutePath).toString();
    }

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
        }
      }
    }

    this.hooks = {
      "invoke:invoke": this.invoke.bind(this)
    };
  }

  private async invoke() {
    const functionName = this.options["function"];
    const data = this.options["data"];
    const method = this.options["method"] || "GET";
    if (!functionName) {
      this.log("Need to provide a name of function to invoke");
      return;
    }

    this.invokeService = new InvokeService(this.serverless, this.options);
    const response = await this.invokeService.invoke(method, functionName, data);
    if (response) {
      this.log(JSON.stringify(response.data));
    }
  }
}
