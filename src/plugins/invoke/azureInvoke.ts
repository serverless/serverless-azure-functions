import Serverless from 'serverless';
import { join, isAbsolute } from 'path';
import AzureProvider from '../../provider/azureProvider';

export class AzureInvoke {
  public hooks: { [eventName: string]: Promise<any> };
  private provider: AzureProvider;

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.provider = (this.serverless.getProvider('azure') as any) as AzureProvider;
    const path = this.options['path'];

    if (path) {
      const absolutePath = isAbsolute(path)
        ? path
        : join(this.serverless.config.servicePath, path);

      if (!this.serverless.utils.fileExistsSync(absolutePath)) {
        throw new Error('The file you provided does not exist.');
      }
      this.options['data'] = this.serverless.utils.readFileSync(absolutePath);
    }

    this.hooks = {
      'before:invoke:invoke': this.provider.getAdminKey.bind(this),
      'invoke:invoke': this.invoke.bind(this)
    };
  }

  private async invoke() {
    const func = this.options.function;
    const functionObject = this.serverless.service.getFunction(func);
    const eventType = Object.keys(functionObject['events'][0])[0];

    if (!this.options['data']) {
      this.options['data'] = {};
    }

    return this.provider.invoke(func, eventType, this.options['data']);
  }
}
