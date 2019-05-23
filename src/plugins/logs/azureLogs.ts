import Serverless from 'serverless';
import AzureProvider from '../../provider/azureProvider';

export class AzureLogs {
  public hooks: { [eventName: string]: Promise<any> };

  private provider: AzureProvider;

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.provider = (this.serverless.getProvider('azure') as any) as AzureProvider;
    
    this.hooks = {
      'logs:logs': this.retrieveLogs.bind(this)
    };
  }

  private async retrieveLogs() {
    await this.provider.pingHostStatus(this.options.function);
    await this.provider.getLogsStream(this.options.function);
  }
}
