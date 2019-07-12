import Serverless from "serverless";
import { ResourceService } from "../../services/resourceService";
import { AzureBasePlugin } from "../azureBasePlugin";

export class AzureRemovePlugin extends AzureBasePlugin {
  public hooks: { [eventName: string]: Promise<any> };

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
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
