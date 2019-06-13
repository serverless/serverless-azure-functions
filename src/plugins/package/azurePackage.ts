
import Serverless from "serverless";
import AzureProvider from "../../provider/azureProvider";
import { PackageService } from "../../services/packageService";

export class AzurePackage {
  private bindingsCreated: boolean = false;
  private packageService: PackageService;
  public provider: AzureProvider;
  public hooks: { [eventName: string]: Promise<any> };

  public constructor(private serverless: Serverless) {
    this.hooks = {
      "before:package:setupProviderConfiguration": this.setupProviderConfiguration.bind(this),
      "before:webpack:package:packageModules": this.webpack.bind(this),
      "after:package:finalize": this.finalize.bind(this),
    };

    this.packageService = new PackageService(this.serverless);
  }

  private async setupProviderConfiguration(): Promise<void> {
    await this.packageService.createBindings();
    this.bindingsCreated = true;

    return Promise.resolve();
  }

  private async webpack(): Promise<void> {
    if (!this.bindingsCreated) {
      await this.setupProviderConfiguration();
    }

    await this.packageService.prepareWebpack();
  }

  /**
   * Cleans up generated folders & files after packaging is complete
   */
  private async finalize(): Promise<void> {
    await this.packageService.cleanUp();
  }
}

