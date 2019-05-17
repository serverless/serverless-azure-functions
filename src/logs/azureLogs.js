'use strict';

const BbPromise = require('bluebird');
const retrieveLogs = require('./lib/retrieveLogs');
const loginToAzure = require('../shared/loginToAzure');

class AzureLogs {
  constructor (serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      loginToAzure,
      retrieveLogs
    );

    this.hooks = {
      'before:logs:logs': () => BbPromise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options))
        .then(this.loginToAzure),

      'logs:logs': () => BbPromise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options))
        .then(this.retrieveLogs)
    };
  }
}

module.exports = AzureLogs;
