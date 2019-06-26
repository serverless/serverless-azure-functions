import { isAbsolute, join } from "path";
import Serverless from "serverless";
import AzureProvider from "../../provider/azureProvider";
import { InvokeService } from "../../services/invokeService";
import { AzureLoginPlugin } from "../login/loginPlugin";

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
          method: {
            usage: "GET or POST request (Default is GET)",
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
      this.serverless.cli.log("Need to provide a name of function to invoke");
      return;
    }
    if (!data) {
      this.serverless.cli.log("Need to provide data or path");
      return;
    }
    this.invokeService = new InvokeService(this.serverless, this.options);
    await this.invokeService.invoke(functionName, data, method);
  }
}
