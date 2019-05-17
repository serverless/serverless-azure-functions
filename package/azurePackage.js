'use strict';

const compileEvents = require('./lib/compileEvents');
const webpackFunctionJson = require('./lib/webpackFunctionJson');

class AzurePackage {
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
      'package:setupProviderConfiguration': this.setupProviderConfiguration.bind(this),
      'before:webpack:package:packageModules': this.packageModules.bind(this),
    };
  }

  async setupProviderConfiguration () {
    this.serverless.cli.log('Building Azure Events Hooks');
    await this.provider.initialize(this.serverless, this.options);
    await this.compileEvents();
  }

  async packageModules () {
    await this.provider.initialize(this.serverless, this.options);
    this.webpackFunctionJson.bind(this);
  }
}

module.exports = AzurePackage;
