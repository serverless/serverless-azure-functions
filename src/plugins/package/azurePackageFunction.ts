
import { Promise } from 'bluebird';
import AzureProvider from '../../provider/azureProvider';
const compileEventsForFunction = require('./lib/compileEventsForFunction');

export class AzurePackageFunction {
  provider: AzureProvider;
  hooks: any;
  compileEventsForFunction: any;

  constructor (private serverless, private options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      compileEventsForFunction
    );

    this.hooks = {
      'before:deploy:function:packageFunction': () => Promise.bind(this)
        .then(() => this.serverless.cli.log('Building Azure Events Hooks'))
        .then(this.provider.initialize(this.serverless, this.options))
        .then(this.compileEventsForFunction),
    };
  }
}
