import Serverless from "serverless";
import { join, isAbsolute } from "path";
import AzureProvider from "../../provider/azureProvider";
import { AzureLoginPlugin } from "../login/loginPlugin";
import { AzureLoginService } from "../../services/loginService";
import { InvokeService } from "../../services/invokeService";
import fs from 'fs';

export class AzureInvoke {
  public hooks: { [eventName: string]: Promise<any> };
  private commands: any;
  private provider: AzureProvider;
  private login: AzureLoginPlugin
  private invokeService: InvokeService;
  public constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.provider = (this.serverless.getProvider("azure") as any) as AzureProvider;
    const path = this.options["path"];
    this.login = new AzureLoginPlugin(this.serverless, this.options);
    
    if (path) {
      const absolutePath = isAbsolute(path)
        ? path
        : join(this.serverless.config.servicePath, path);

    if (!this.serverless.utils.fileExistsSync(absolutePath)) {
      throw new Error("The file you provided does not exist.");
    }
      this.options["data"] = this.serverless.utils.readFileSync(absolutePath);
    }
    this.commands = {
      invoke: {
        usage: "Invoke command",
        lifecycleEvents: [
          "invoke"
        ],
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
          name: {
            usage: "Name of the function to invoke",
            shortcut: "n"
          }
        }
      }
    }
    this.hooks = {
      "invoke:invoke": this.invoke.bind(this)
    };

  }

  private async invoke() {

    this.invokeService = new InvokeService(this.serverless, this.options);
    await this.invokeService.invoke();

    if (!("function" in this.options)) {
      this.serverless.cli.log("Need to provide a name of function to invoke");
      return;
    }
    const funcToInvoke = this.options["function"];
    const exists = fs.existsSync(funcToInvoke);
    if (!exists) {
      this.serverless.cli.log(`Function ${funcToInvoke} does not exist`);
      return;
    }
    this.serverless.cli.log(`Invoking ${funcToInvoke}`);
    const functionObject = this.serverless.service.getFunction(funcToInvoke);
    return this.invokeService.invokefunction(funcToInvoke, Object.keys(functionObject["events"][0])[0], this.options["data"]);
  }
}
