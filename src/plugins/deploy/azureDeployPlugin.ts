import Serverless from "serverless";
import { ResourceService } from "../../services/resourceService";
import { FunctionAppService } from "../../services/functionAppService";

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
        }
      }
    }
  }

  private async list() {
    this.serverless.cli.log("Listing deployments");
    const resourceService = new ResourceService(this.serverless, this.options);
    const deployments = await resourceService.getDeployments();
    if (!deployments || deployments.length === 0) {
      this.serverless.cli.log(`No deployments found for resource group '${resourceService.getResourceGroup()}'`);
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
    this.serverless.cli.log(stringDeployments);
  }

  private async deploy() {
    this.serverless.cli.log("OPTIONS");
    this.serverless.cli.log(JSON.stringify(this.options, null, 4));
    this.serverless.cli.log("PROVIDER REGION");
    this.serverless.cli.log(this.serverless.service.provider.region);

    const resourceService = new ResourceService(this.serverless, this.options);
    await resourceService.deployResourceGroup();

    const functionAppService = new FunctionAppService(this.serverless, this.options);

    const functionApp = await functionAppService.deploy();
    await functionAppService.uploadFunctions(functionApp);
  }
}
