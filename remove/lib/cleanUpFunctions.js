'use strict';

module.exports = {
  cleanUpFunctions() {
    this.provider.initialise(this.serverless, this.options);

    return this.provider.isExistingFunctionApp()
      .then(() => this.provider.getDeployedFunctionsNames())
      .then(() => this.provider.deleteFunctions(this.serverless.service.getAllFunctions()));
  }
};
