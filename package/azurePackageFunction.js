'use strict';

const compileEventsForFunction = require('./lib/compileEventsForFunction');

class AzurePackageFunction {
  constructor (serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      compileEventsForFunction
    );

    this.hooks = {
      'before:deploy:function:packageFunction': async () => await this.packageFunction.bind(this),
    };
  }

  async packageFunction () {
    this.serverless.cli.log('Building Azure Events Hooks');
    await this.provider.initialize(this.serverless, this.options);
    await this.compileEventsForFunction();
  }
}

module.exports = AzurePackageFunction;
