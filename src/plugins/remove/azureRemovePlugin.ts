import Serverless from "serverless";
import { ResourceService } from "../../services/resourceService";
import { AzureBasePlugin } from "../azureBasePlugin";
import { Utils } from "../../shared/utils";
import { constants } from "../../shared/constants";

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
          ...constants.deployedServiceOptions,
          force: {
            usage: "Force remove resource group without additional prompt",
            type: "boolean"
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
    let okToDelete = this.getOption("force") !== undefined;
    if (!okToDelete) {
      this.log(`This command will delete your ENTIRE resource group (${resourceService.getResourceGroupName()}). ` +
      "and ALL the Azure resources that it contains " +
      "Are you sure you want to proceed? If so, enter the full name of the resource group :");
      const input = await Utils.waitForUserInput();
      okToDelete = input === resourceService.getResourceGroupName();
    }
    
    if (okToDelete) {
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
