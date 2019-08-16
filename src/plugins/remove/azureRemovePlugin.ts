import Serverless from "serverless";
import { ResourceService } from "../../services/resourceService";
import { AzureBasePlugin } from "../azureBasePlugin";

export class AzureRemovePlugin extends AzureBasePlugin {

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);

    this.commands = {
      remove: {
        usage: "Remove service resource group (USE WITH CAUTION)",
        lifecycleEvents: [
          "remove"
        ],
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
        }
      }
    }

    this.hooks = {
      "remove:remove": this.remove.bind(this)
    };
  }

  private async remove() {
    const resourceClient = new ResourceService(this.serverless, this.options);
    await resourceClient.deleteDeployment();
    await resourceClient.deleteResourceGroup();

    this.log("Service successfully removed");
  }
}
