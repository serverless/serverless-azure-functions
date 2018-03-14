'use strict';

const BbPromise = require('bluebird');
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
      'package:setupProviderConfiguration': () => BbPromise.bind(this)
        .then(() => this.serverless.cli.log('Building Azure Events Hooks'))
        .then(this.provider.initialize(this.serverless, this.options))
        .then(this.compileEvents),

      'before:webpack:package:packageModules': () => BbPromise.bind(this)
        .then(this.provider.initialize(this.serverless, this.options))
        .then(this.webpackFunctionJson.bind(this))
    };
  }
}

module.exports = AzurePackage;
