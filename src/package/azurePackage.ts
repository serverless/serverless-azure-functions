import { Promise } from 'bluebird';
import compileEvents from './compileEvents';
import webpackFunctionJson from './webpackFunctionJson';

export class AzurePackage {
  serverless: any;
  options: any;
  provider: any;
  hooks: any;
  compileEvents: any;
  webpackFunctionJson: any;

  constructor (serverless, options) {
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
