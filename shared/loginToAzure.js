'use strict';

module.exports = {
  loginToAzure () {
    this.serverless.cli.log('Logging in to Azure');

    return this.provider.Login();
  }
};
