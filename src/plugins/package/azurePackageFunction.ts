
import * as Serverless from 'serverless';
import { createEventsBindings } from '../../shared/bindings';
import { getFunctionMetaData } from '../../shared/utils';

export class AzurePackageFunction {
  public hooks: { [eventName: string]: Promise<any> };

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      'before:deploy:function:packageFunction': this.packageFunction.bind(this)
    };
  }

  private async packageFunction() {
    this.serverless.cli.log('Building Azure Events Hooks');
    await this.compileEventsForFunction();
  }

  private async compileEventsForFunction(): Promise<any> {
    const functionName = this.options.function;
    const metaData = getFunctionMetaData(functionName, this.serverless);

    return createEventsBindings(this.serverless, functionName, metaData);
  }

  

  
}
