
import * as Serverless from 'serverless';
import AzureProvider from '../../provider/azureProvider';
import { compileEvents } from './lib/compileEvents';
import { webpackFunctionJson } from './lib/webpackFunctionJson';

export class AzurePackage {
  provider: AzureProvider
  public hooks: { [eventName: string]: Promise<any> };

  private compileEvents: () => Promise<any>;
  private webpackFunctionJson: () => Promise<any>;

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    Object.assign(
      this,
      compileEvents,
      webpackFunctionJson
    );

    this.hooks = {
      'package:setupProviderConfiguration': this.setupProviderConfiguration.bind(this),
      'before:webpack:package:packageModules': this.webpackFunctionJson.bind(this)
    };
  }

  private async setupProviderConfiguration() {
    this.serverless.cli.log('Building Azure Events Hooks');
    return await this.compileEvents();
  }
}
