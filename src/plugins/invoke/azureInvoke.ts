import * as Serverless from 'serverless';
import { invokeFunction } from './lib/invokeFunction';
import { getAdminKey } from '../../shared/getAdminKey';
import { join, isAbsolute } from 'path';

export class AzureInvoke {
  public hooks: { [eventName: string]: Promise<any> };
  private invokeFunction: () => Promise<any>;
  private getAdminKey: () => Promise<any>;

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.serverless = serverless;
    this.options = options;

    Object.assign(
      this,
      getAdminKey,
      invokeFunction
    );

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
      'before:invoke:invoke': this.getAdminKey.bind(this),
      'invoke:invoke': this.invokeFunction.bind(this)
    };
  }
}
