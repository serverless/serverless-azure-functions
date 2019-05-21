
import * as Serverless from 'serverless';
import { compileEventsForFunction } from './lib/compileEventsForFunction';

export class AzurePackageFunction {
  public hooks: { [eventName: string]: Promise<any> };
  private compileEventsForFunction = compileEventsForFunction;

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      'before:deploy:function:packageFunction': this.packageFunction.bind(this)
    };
  }

  private async packageFunction() {
    this.serverless.cli.log('Building Azure Events Hooks');
    await this.compileEventsForFunction();
  }
}
