'use strict';

const BbPromise = require('bluebird');

module.exports = {
  deployOperations() {
    this.serverless.cli.log('Starting to deploy Operations');

    const deployApiTasks = this.serverless.service.getAllFunctions().map((functionName) => {
      return this.provider.deployApiOperation(functionName);
    });

    return BbPromise.all(deployApiTasks);
  }
};
