import Serverless from "serverless";
import { ApimService } from "../../services/apimService";
import { AzureBasePlugin } from "../azureBasePlugin";

export class AzureApimPlugin extends AzureBasePlugin {

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
    this.hooks = {
      "after:deploy:deploy": this.deploy.bind(this),
      "deploy:apim:apim": this.deploy.bind(this),
    };

    this.commands = {
      deploy: {
        usage: "Deploys APIM",
        lifecycleEvents: ["deploy"],
        commands: {
          apim: {
            usage: "Deploys APIM",
            lifecycleEvents: ["apim"]
          }
        }
      }
    };
  }

  private async deploy() {
    const apimConfig = this.serverless.service.provider["apim"];
    if (!apimConfig) {
      return Promise.resolve();
    }

    this.serverless.cli.log("Starting APIM service deployment");

    const apimService = new ApimService(this.serverless, this.options);
    await apimService.deploy();

    this.log("Finished APIM service deployment");
  }
}
