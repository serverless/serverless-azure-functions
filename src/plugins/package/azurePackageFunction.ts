'use strict';

const BbPromise = require('bluebird');
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
      'before:deploy:function:packageFunction': () => BbPromise.bind(this)
        .then(() => this.serverless.cli.log('Building Azure Events Hooks'))
        .then(this.provider.initialize(this.serverless, this.options))
        .then(this.compileEventsForFunction),
    };
  }
}

module.exports = AzurePackageFunction;
