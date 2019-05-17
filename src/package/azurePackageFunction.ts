import { Promise } from 'bluebird';
import compileEventsForFunction from './lib/compileEventsForFunction';

export class AzurePackageFunction {
  serverless: any;
  options: any;
  provider: any;
  hooks: any;
  compileEventsForFunction: any;

  constructor (serverless, options) {
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
