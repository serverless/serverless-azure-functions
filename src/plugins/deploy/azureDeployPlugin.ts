import fs from "fs";
import Serverless from "serverless";
import { ApimService } from "../../services/apimService";
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
      "deploy:apim:apim": this.deployApim.bind(this),
    };

    const deployOptions = {
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
      },
      slot: {
        usage: "Slot used for deployment",
        shortcut: "l"
      }
    }

    this.commands = {
      deploy: {
        commands: {
          list: {
            usage: "List deployments",
            lifecycleEvents: ["list"],
            options: {
              ...deployOptions
            }
          },
          apim: {
            usage: "Deploys APIM",
            lifecycleEvents: ["apim"]
          }
        },
        options: {
          ...deployOptions
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
    this.checkDeploymentSlot();
    const resourceService = new ResourceService(this.serverless, this.options);
    const functionAppService = new FunctionAppService(this.serverless, this.options);
    const zipFile = functionAppService.getFunctionZipFile();
    if (!fs.existsSync(zipFile)) {
      throw new Error(`Function app zip file '${zipFile}' does not exist`);
    }
    await resourceService.deployResourceGroup();
    const deploymentSlot = this.config.provider.deployment ? this.config.provider.deployment.slot : null;
    const functionApp = await functionAppService.deploy(deploymentSlot);
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

    this.serverless.cli.log("Starting APIM service deployment");

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

  /**
   * Check to see if the slot the user specified was either configured in the serverless.yml already
   * Or is production, otherwise throw an error since it won't have been created by the ARM templates
   */
  private checkDeploymentSlot() {
    const functionAppSlot = this.config.provider.functionApp ? this.config.provider.functionApp.slot : null;
    if (this.options.slot && functionAppSlot && !["prod", "production"].includes(this.options.slot) && this.options.slot !== functionAppSlot) {
      throw new Error(`You are attempting to deploy to the ${this.options.slot} slot however no such slot has been cofigured in the serverless.yml deployment config.`
      + " If no deployment slot is configured, a default one of 'staging' is configured for you."
      + ` In the serverless.yaml please consider adding the following: \nprovider:\n\t...\n\tdeployment: ${this.options.slot}\n\n`);
    }
  }
}
