import Serverless from "serverless";
import { FunctionAppService } from "../../services/functionAppService";
import { ResourceService } from "../../services/resourceService";
import { Utils } from "../../shared/utils";
import { AzureBasePlugin } from "../azureBasePlugin";
import { AzureLoginOptions } from "../../services/loginService";

export class AzureDeployPlugin extends AzureBasePlugin {
  public hooks: { [eventName: string]: Promise<any> };
  public commands: any;

  public constructor(serverless: Serverless, private options: Serverless.Options & AzureLoginOptions) {
    super(serverless);

    this.hooks = {
      "deploy:deploy": this.deploy.bind(this),
      "deploy:list:list": this.list.bind(this),
    };

    this.commands = {
      deploy: {
        commands: {
          list: {
            usage: "List deployments",
            lifecycleEvents: [
              "list"
            ]
          }
        },
        options: {
          "resourceGroup": {
            usage: "Resource group for the service",
            shortcut: "g",
          }, 
          subscriptionId: {
            usage: "Sets the Azure subscription ID",
            shortcut: "i",
          }
        }
      }
    }
  }

  private async list() {
    this.log("Listing deployments");
    const resourceService = new ResourceService(this.serverless, this.options);
    const deployments = await resourceService.getDeployments();
    if (!deployments || deployments.length === 0) {
      this.log(`No deployments found for resource group '${resourceService.getResourceGroupName()}'`);
      return;
    }
    let stringDeployments = "\n\nDeployments";

    for (const dep of deployments) {
      stringDeployments += "\n-----------\n"
      stringDeployments += `Name: ${dep.name}\n`
      const timestampFromName = Utils.getTimestampFromName(dep.name);
      stringDeployments += `Timestamp: ${(timestampFromName) ? timestampFromName : "None"}\n`;

      const dateTime = timestampFromName ? new Date(+timestampFromName).toISOString() : "None";
      stringDeployments += `Datetime: ${dateTime}\n`
    }

    stringDeployments += "-----------\n"
    this.log(stringDeployments);
  }

  private async deploy() {
    const resourceService = new ResourceService(this.serverless, this.options);
    await resourceService.deployResourceGroup();

    const functionAppService = new FunctionAppService(this.serverless, this.options);
    const functionApp = await functionAppService.deploy();

    await functionAppService.uploadFunctions(functionApp);
  }
}
