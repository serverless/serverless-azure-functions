'use strict';

const BbPromise = require('bluebird');
const compileEvents = require('./lib/compileEvents');
const pkgFunctionJson = require('./lib/pkgFunctionJson');

class AzurePackage {
  constructor (serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      compileEvents,
      pkgFunctionJson
    );

    this.hooks = {
      'before:webpack:package:packageModules': () => BbPromise.bind(this)
        .then(() => this.serverless.cli.log('>>> before:webpack:package:packageModules <<<'))
        .then(this.provider.initialize(this.serverless, this.options))
        .then(this.pkgFunctionJson.bind(this))
        .then(() => this.serverless.cli.log('Copied function.json files to webpack bundle')),

      'package:setupProviderConfiguration': () => BbPromise.bind(this)
        .then(() => this.serverless.cli.log('Building Azure Events Hooks'))
        .then(this.provider.initialize(this.serverless, this.options))
        .then(this.compileEvents),
    };
  }
}

module.exports = AzurePackage;
