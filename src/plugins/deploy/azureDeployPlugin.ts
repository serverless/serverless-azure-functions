import Serverless from "serverless";
import { FunctionAppService } from "../../services/functionAppService";
import { ResourceService } from "../../services/resourceService";

export class AzureDeployPlugin {
  public hooks: { [eventName: string]: Promise<any> };
  public commands: any;

  public constructor(private serverless: Serverless, private options: Serverless.Options) {
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
            usage: "resource group for the service",
            shortcut: "g",
          }
        }
      }
    }
  }

  private log(message: string) {
    this.serverless.cli.log(message);
  }

  private async list() {
    this.serverless.cli.log("Listing deployments");
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
      stringDeployments += `Timestamp: ${dep.properties.timestamp.getTime()}\n`;
      stringDeployments += `Datetime: ${dep.properties.timestamp.toISOString()}\n`
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
