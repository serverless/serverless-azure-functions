import fs from "fs";
import Serverless from "serverless";
import { FunctionAppService } from "../../services/functionAppService";
import { AzureLoginOptions } from "../../services/loginService";
import { ResourceService } from "../../services/resourceService";
import { Utils } from "../../shared/utils";
import { AzureBasePlugin } from "../azureBasePlugin";

export class AzureDeployPlugin extends AzureBasePlugin<AzureLoginOptions> {
  public hooks: { [eventName: string]: Promise<any> };
  public commands: any;

  public constructor(serverless: Serverless, options: AzureLoginOptions) {
    super(serverless, options);

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
          resourceGroup: {
            usage: "Resource group for the service",
            shortcut: "g",
          },
          subscriptionId: {
            usage: "Sets the Azure subscription ID",
            shortcut: "i",
          },
          package: {
            usage: "Package to deploy",
            shortcut: "p",
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
    const functionAppService = new FunctionAppService(this.serverless, this.options);
    const zipFile = functionAppService.getFunctionZipFile();
    if (!fs.existsSync(zipFile)) {
      this.log(`Function app zip file '${zipFile}' does not exist`);
      return Promise.resolve();
    }
    await resourceService.deployResourceGroup();
    const functionApp = await functionAppService.deploy();
    await functionAppService.uploadFunctions(functionApp);
  }
}
