import * as Serverless from 'serverless';
import { retrieveLogs } from './lib/retrieveLogs';

export class AzureLogs {
  public hooks: { [eventName: string]: Promise<any> };
  private retrieveLogs: () => Promise<any>;

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    Object.assign(
      this,
      retrieveLogs
    );

    this.hooks = {
      'logs:logs': this.retrieveLogs.bind(this)
    };
  }
}
