'use strict';

const invokeFunction = require('./lib/invokeFunction');
const getAdminKey = require('../shared/getAdminKey');
const loginToAzure = require('../shared/loginToAzure');
const path = require('path');

class AzureInvoke {
  constructor (serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      loginToAzure,
      getAdminKey,
      invokeFunction
    );

    if (this.options.path) {
      const absolutePath = path.isAbsolute(this.options.path)
        ? this.options.path
        : path.join(this.serverless.config.servicePath, this.options.path);

      if (!this.serverless.utils.fileExistsSync(absolutePath)) {
        throw new this.serverless.classes.Error('The file you provided does not exist.');
      }
      this.options.data = this.serverless.utils.readFileSync(absolutePath);
    }

    this.hooks = {

      // TODO: See ./lib/invokeFunction.js:L10
      'before:invoke:invoke': this.beforeInvoke.bind(this),

      'invoke:invoke': this.invoke.bind(this),
    };
  }

  async beforeInvoke () {
    await this.provider.initialize(this.serverless, this.options);
    await this.getAdminKey();
  }

  async invoke () {
    await this.provider.initialize(this.serverless, this.options);
    await this.invokeFunction();
  }
}

module.exports = AzureInvoke;
