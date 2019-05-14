'use strict';

module.exports = {
  deployOperation() {
    this.serverless.cli.log('Starting to deploy Operation');
    this.serverless.cli.log(JSON.stringify(this.options));

    return this.provider.deployApiOperation(this.options.function);
  }
};