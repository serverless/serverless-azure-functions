import Serverless from "serverless";

export class AzureFuncPlugin {
  public hooks: { [eventName: string]: Promise<any> };
  public commands: any;
  

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      "func:func": this.func.bind(this),
    };

    this.commands = {
      func: {
        usage: "Add or remove functions",
        lifecycleEvents: [
          "func",
        ],
      }
    }
  }

  private async func() {
    this.serverless.cli.log("Use the func plugin to add or remove functions within Function App");
  }
}