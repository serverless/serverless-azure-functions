
import { compileEventsForFunction } from './lib/compileEventsForFunction';

export class AzurePackageFunction {
  public hooks: { [eventName: string]: Promise<any> };
  private compileEventsForFunction: () => Promise<any>;

  constructor(private serverless, private options) {
    this.serverless = serverless;
    this.options = options;

    Object.assign(
      this,
      compileEventsForFunction
    );

    this.hooks = {
      'before:deploy:function:packageFunction': this.packageFunction.bind(this)
    };
  }

  private async packageFunction() {
    this.serverless.cli.log('Building Azure Events Hooks');
    await this.compileEventsForFunction();
  }
}
