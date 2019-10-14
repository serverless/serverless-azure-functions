
import Serverless from "serverless";
import { ServerlessCliCommand, FunctionAppOS } from "../../models/serverless";
import AzureProvider from "../../provider/azureProvider";
import { PackageService } from "../../services/packageService";
import { AzureBasePlugin } from "../azureBasePlugin";

export class AzurePackagePlugin extends AzureBasePlugin {
  private bindingsCreated: boolean = false;
  public provider: AzureProvider;
  private isLinuxTarget: boolean;

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
    this.hooks = {
      "before:package:setupProviderConfiguration": this.setupProviderConfiguration.bind(this),
      "before:webpack:package:packageModules": this.webpack.bind(this),
      "after:package:finalize": this.finalize.bind(this),
    };
    const { provider } = this.serverless.service;
    this.isLinuxTarget = provider["os"] === FunctionAppOS.LINUX || provider.runtime.includes("python")
    if (this.isLinuxTarget) {
      /**
       * Replacing lifecycle event to build a deployment artifact with our own
       * 
       * Without the delete of the pre-existing hook, setting the hook attempts 
       * to push the function to an array of functions. We just want to replace it.
       * 
       * IMPORTANT: Currently, azure-functions-core-tools does not support publishing
       * an existing package. Therefore, the package created from this step is never
       * actually used. This also means rollback will not work. Keeping this in
       * here so that the package can still be archived in blob storage.
       * 
       * Communication has been made to the dev team, the feature request has been 
       * created in GitHub:
       * 
       * https://github.com/Azure/azure-functions-core-tools/issues/1589
       * 
       * and the team has triaged the feature to be added to the tool in future sprints.
       * 
       * When that feature is added, we can invoke the publish command of core tools
       * to publish this package: see services/coreToolsService.ts
       */
      delete this.serverless.pluginManager.hooks["package:createDeploymentArtifacts"]
      this.hooks["package:createDeploymentArtifacts"] = this.createCustomArtifact.bind(this);
    }
  }

  private async setupProviderConfiguration(): Promise<void> {
    const packageService = new PackageService(this.serverless, this.options);

    if (this.processedCommands[0] === ServerlessCliCommand.DEPLOY && this.getOption("package")) {
      this.log("Deploying pre-built package. No need to create bindings");
      return;
    }
    if (this.config.package && this.config.package.individually) {
      throw new Error("Cannot package Azure Functions individually. " +
        "Remove `individually` attribute from the `package` section of the serverless config");
    }
    packageService.cleanUpServerlessDir();
    await packageService.createBindings();
    
    this.bindingsCreated = true;

    return Promise.resolve();
  }

  private async webpack(): Promise<void> {
    const packageService = new PackageService(this.serverless, this.options);

    if (this.getOption("package")) {
      this.log("No need to perform webpack. Using pre-existing package");
      return Promise.resolve();
    }
    if (!this.bindingsCreated) {
      await this.setupProviderConfiguration();
    }

    await packageService.prepareWebpack();
  }

  private async createCustomArtifact(): Promise<void> {
    const packageService = new PackageService(this.serverless, this.options);
    await packageService.createPackage();
  }

  /**
   * Cleans up generated folders & files after packaging is complete
   */
  private async finalize(): Promise<void> {
    const packageService = new PackageService(this.serverless, this.options);

    if (this.getOption("package")) {
      this.log("No need to clean up generated folders & files. Using pre-existing package");
      return Promise.resolve();
    }
    if (!this.isLinuxTarget) {
      /**
       * Cannot cleanup if linux target because we cannot currently
       * publish an existing package. See comment above. Files need to exist
       * in order for the func publish command to work
       */
      await packageService.cleanUp();
    }
  }
}
