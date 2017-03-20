'use strict';

module.exports = {
  cleanUpFunctions () {
    return this.provider.isExistingFunctionApp()
      .then(() => this.provider.getDeployedFunctionsNames())
      .then(() => this.provider.deleteFunctions(this.serverless.service.getAllFunctions()));
  }
};
