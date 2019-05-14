'use strict';

module.exports = {
  deployApi() {
    this.serverless.cli.log('Starting to deploy API');
    this.serverless.cli.log(JSON.stringify(this.options));

    return this.provider.deployApi(this.options);
  }
};
