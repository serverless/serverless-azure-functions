import fs from "fs";
import path, { isAbsolute } from "path";
import Serverless from "serverless";
import { InvokeService, InvokeMode } from "../../services/invokeService";
import { AzureBasePlugin } from "../azureBasePlugin";
import { constants } from "../../shared/constants";

export class AzureInvokePlugin extends AzureBasePlugin {

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);

    this.commands = {
      invoke: {
        usage: "Invoke command",
        lifecycleEvents: ["invoke"],
        options: {
          ...constants.deployedServiceOptions,
          ...constants.invokeOptions,
        },
        commands: {
          local: {
            usage: "Invoke a local function",
            options: {
              ...constants.invokeOptions,
              port: {
                usage: "Port through which locally running service is exposed",
                shortcut: "t",
                type: "string",
              }
            },
            lifecycleEvents: [ "local" ],
          },
          apim: {
            usage: "Invoke a function via APIM",
            options: {
              ...constants.invokeOptions,
            },
            lifecycleEvents: [ "apim" ],
          },
        }
      }
    }

    this.hooks = {
      "invoke:invoke": this.invokeRemote.bind(this),
      "invoke:local:local": this.invokeLocal.bind(this),
      "invoke:apim:apim": this.invokeApim.bind(this),
    };
  }

  private async invokeRemote() {
    await this.invoke(InvokeMode.FUNCTION);
  }

  private async invokeLocal() {
    await this.invoke(InvokeMode.LOCAL);
  }

  private async invokeApim() {
    await this.invoke(InvokeMode.APIM);
  }

  private async invoke(mode: InvokeMode) {
    const functionName = this.options["function"];
    const method = this.options["method"] || "GET";
    if (!functionName) {
      this.log("Need to provide a name of function to invoke");
      return;
    }

    const invokeService = new InvokeService(this.serverless, this.options, mode);
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
