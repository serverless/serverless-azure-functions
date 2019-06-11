
import Serverless from "serverless";
import AzureProvider from "../../provider/azureProvider";
import { PackageService } from "../../services/packageService";

export class AzurePackage {
  private bindingsCreated: boolean = false;
  private packageService: PackageService;
  public provider: AzureProvider;
  public hooks: { [eventName: string]: Promise<any> };

  public constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      "before:package:setupProviderConfiguration": this.setupProviderConfiguration.bind(this),
      "before:webpack:package:packageModules": this.webpack.bind(this),
      "after:package:finalize": this.finalize.bind(this),
    };

    this.packageService = new PackageService(this.serverless);
  }

  private async setupProviderConfiguration(): Promise<any[]> {
    return await this.packageService.createBindings();
  }

  private async webpack(): Promise<void> {

    if (!this.bindingsCreated) {
      await this.packageService.createBindings();
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

