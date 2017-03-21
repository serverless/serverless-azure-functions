'use strict';

module.exports = {
  loginToAzure () {
    this.serverless.cli.log('Logging in to Azure');
    this.provider.initialise(this.serverless, this.options);

    return this.provider.LoginWithServicePrincipal();
  }
};
