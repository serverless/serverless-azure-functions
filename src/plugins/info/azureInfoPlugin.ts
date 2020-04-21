import Serverless from "serverless";
import { AzureBasePlugin } from "../azureBasePlugin";
import { constants } from "../../shared/constants";
import { AzureInfoService, ServiceInfoType } from "../../services/infoService";

export class AzureInfoPlugin extends AzureBasePlugin {

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);

    this.hooks = {
      "info:info": this.executeInfo.bind(this)
    };

    this.commands = {
      info: {
        usage: "Get information about deployed Azure resources for service",
        lifecycleEvents: [
          "info",
        ],
        options: {
          ...constants.deployedServiceOptions,
          dryrun: {
            usage: "Get a summary for what the deployment would look like",
            shortcut: "d",
          },
          arm: {
            usage: "Inspect the ARM template of either the last successful deployment or the generated template",
            shortcut: "a",
          }
        }
      }
    }
  }

  private async executeInfo() {
    const infoService = new AzureInfoService(this.serverless, this.options);
    const infoType = "dryrun" in this.options ? ServiceInfoType.DRYRUN : ServiceInfoType.DEPLOYED
    infoService.printInfo(infoType);
  }
}
