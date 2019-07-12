import Serverless from "serverless";
import AzureProvider from "../../provider/azureProvider";
import { AzureBasePlugin } from "../azureBasePlugin";

export class AzureLogsPlugin extends AzureBasePlugin {
  public hooks: { [eventName: string]: Promise<any> };

  private provider: AzureProvider;

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);

    this.provider = (this.serverless.getProvider("azure") as any) as AzureProvider;

    this.hooks = {
      "logs:logs": this.retrieveLogs.bind(this)
    };
  }

  private async retrieveLogs() {
    await this.provider.pingHostStatus(this.options.function);
    await this.provider.getLogsStream(this.options.function);
  }
}
