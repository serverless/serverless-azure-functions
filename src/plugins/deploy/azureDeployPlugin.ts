import fs from "fs";
import Serverless from "serverless";
import { FunctionAppService } from "../../services/functionAppService";
import { AzureLoginOptions } from "../../services/loginService";
import { ResourceService } from "../../services/resourceService";
import { AzureBasePlugin } from "../azureBasePlugin";

export class AzureDeployPlugin extends AzureBasePlugin<AzureLoginOptions> {
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
          },
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
            function: {
              usage: "Deployment of individual function - NOT SUPPORTED",
              shortcut: "f",
            }
          }
        },
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
          package: {
            usage: "Package to deploy",
            shortcut: "p",
          },
          function: {
            usage: "Deployment of individual function - NOT SUPPORTED",
            shortcut: "f",
          }
        }
      }
    }
  }

  private async list() {
    this.checkForIndividualFunctionDeploy();
    this.log("Listing deployments");
    const resourceService = new ResourceService(this.serverless, this.options);
    this.log(await resourceService.listDeployments());
  }

  private async deploy() {
    this.checkForIndividualFunctionDeploy();
    const resourceService = new ResourceService(this.serverless, this.options);
    const functionAppService = new FunctionAppService(this.serverless, this.options);
    const zipFile = functionAppService.getFunctionZipFile();
    if (!fs.existsSync(zipFile)) {
      throw new Error(`Function app zip file '${zipFile}' does not exist`);
    }
    await resourceService.deployResourceGroup();
    const functionApp = await functionAppService.deploy();
    await functionAppService.uploadFunctions(functionApp);
  }

  /**
   * Check to see if user tried to target an individual function for deployment or deployment list
   * Throws error if `function` is specified
   */
  private checkForIndividualFunctionDeploy() {
    if (this.options.function) {
      throw new Error("The Azure Functions plugin does not currently support deployments of individual functions. " +
        "Azure Functions are zipped up as a package and deployed together as a unit");
    }
  }
}
