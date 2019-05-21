import * as Serverless from 'serverless';
import { retrieveLogs } from './lib/retrieveLogs';

export class AzureLogs {
  public hooks: { [eventName: string]: Promise<any> };
  
  private retrieveLogs = retrieveLogs;

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      'logs:logs': this.retrieveLogs.bind(this)
    };
  }
}
