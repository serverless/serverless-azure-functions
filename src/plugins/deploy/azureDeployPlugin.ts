import fs from "fs";
import Serverless from "serverless";
import { FunctionAppService } from "../../services/functionAppService";
import { AzureLoginOptions } from "../../services/loginService";
import { ResourceService } from "../../services/resourceService";
import { AzureBasePlugin } from "../azureBasePlugin";
import { ApimService } from "../../services/apimService";
import { constants } from "../../shared/constants";
import { AzureInfoService } from "../../services/infoService";

export class AzureDeployPlugin extends AzureBasePlugin<AzureLoginOptions> {
  public commands: any;

  public constructor(serverless: Serverless, options: AzureLoginOptions) {
    super(serverless, options);

    this.hooks = {
      "deploy:deploy": this.deploy.bind(this),
      "deploy:list:list": this.list.bind(this),
      "deploy:apim:apim": this.deployApim.bind(this),
    };

    this.commands = {
      deploy: {
        commands: {
          list: {
            usage: "List deployments",
            lifecycleEvents: ["list"],
            options: {
              ...constants.deployedServiceOptions
            }
          },
          apim: {
            usage: "Deploys APIM",
            lifecycleEvents: ["apim"]
          }
        },
        options: {
          ...constants.deployedServiceOptions,
          dryrun: {
            usage: "Get a summary for what the deployment would look like",
            shortcut: "d"
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
    if (this.getOption("dryrun")) {
      const infoService = new AzureInfoService(this.serverless, this.options);
      await infoService.printInfo();
      return;
    }
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
   * Deploys APIM if configured
   */
  private async deployApim() {
    const apimConfig = this.serverless.service.provider["apim"];
    if (!apimConfig) {
      this.log("No APIM configuration found");
      return Promise.resolve();
    }

    this.log("Starting APIM service deployment");

    const apimService = new ApimService(this.serverless, this.options);
    await apimService.deploy();

    this.log("Finished APIM service deployment");
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
