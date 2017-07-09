'use strict';

const BbPromise = require('bluebird');
const createFunctions = require('./lib/createFunctions');
const createEvents = require('./lib/createEvents');

class AzurePackage {
  constructor (serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      createFunctions,
      createEvents
    );

    this.hooks = {
      'package:compileFunctions': () => BbPromise.bind(this)
        .then(() => this.serverless.cli.log('Azure build Function Hooks'))
        .then(this.provider.initialize(this.serverless, this.options))
        .then(this.createFunctions),
      'package:compileEvents': () => BbPromise.bind(this)
        .then(() => this.serverless.cli.log('Azure build Events Hooks'))
        .then(this.provider.initialize(this.serverless, this.options))
        .then(this.createEvents)
    };
  }
}

module.exports = AzurePackage;
