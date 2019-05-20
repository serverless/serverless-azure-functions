
import { Promise } from 'bluebird';
import AzureProvider from '../../provider/azureProvider';
const compileEvents = require('./lib/compileEvents');
const webpackFunctionJson = require('./lib/webpackFunctionJson');

export class AzurePackage {
  provider: AzureProvider
  hooks: any;
  compileEvents: any;
  webpackFunctionJson: any;

  constructor (private serverless, private options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      compileEvents,
      webpackFunctionJson
    );

    this.hooks = {
      'package:setupProviderConfiguration': () => Promise.bind(this)
        .then(() => this.serverless.cli.log('Building Azure Events Hooks'))
        .then(this.provider.initialize(this.serverless, this.options))
        .then(this.compileEvents),

      'before:webpack:package:packageModules': () => Promise.bind(this)
        .then(this.provider.initialize(this.serverless, this.options))
        .then(this.webpackFunctionJson.bind(this))
    };
  }
}
