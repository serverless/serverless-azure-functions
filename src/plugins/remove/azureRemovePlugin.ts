import Serverless from "serverless";
import { ResourceService } from "../../services/resourceService";
import { AzureBasePlugin } from "../azureBasePlugin";
import { Utils } from "../../shared/utils";

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
    const resourceService = new ResourceService(this.serverless, this.options);
    const rg = await resourceService.getResourceGroup();
    const rgName = resourceService.getResourceGroupName();
    if (!rg) {
      this.log(`Resource group "${rgName}" does not exist in your Azure subscription`)
      return;
    }
    this.log(`This command will delete your ENTIRE resource group (${resourceService.getResourceGroupName()}). ` +
      "and ALL the Azure resources that it contains " +
      "Are you sure you want to proceed? If so, enter the full name of the resource group :");
    const input = await Utils.waitForUserInput();
    if (input === resourceService.getResourceGroupName()) {
      this.log("Deleting resource group");
      await resourceService.deleteDeployment();
      await resourceService.deleteResourceGroup();
      this.log("Service successfully removed");
    }
    else {
      this.log("Will not remove resource group.");
      return;
    }
  }
}
