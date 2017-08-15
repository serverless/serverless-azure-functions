'use strict';

const BbPromise = require('bluebird');
const compileEvents = require('./lib/compileEvents');

class AzurePackage {
  constructor (serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      compileEvents
    );

    this.hooks = {
      'package:setupProviderConfiguration': () => BbPromise.bind(this)
        .then(() => this.serverless.cli.log('Building Azure Events Hooks'))
        .then(this.provider.initialize(this.serverless, this.options))
        .then(this.compileEvents),
    };
  }
}

module.exports = AzurePackage;