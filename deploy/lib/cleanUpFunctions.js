'use strict';

module.exports = {
  cleanUpFunctions () {
    this.provider.initialise(this.serverless, this.options);

    return this.provider.isExistingFunctionApp()
      .then(() => this.provider.getDeployedFunctionsNames())
      .then(() => {
        if (this.serverless.config && this.serverless.config.preserveDeployedFunctions) {
          this.serverless.cli.log(`Skipping cleaning of existing functions as '--preserve' has been specified.`);
          return;
        }

        this.provider.deleteFunctionsExcluding(this.serverless.service.getAllFunctions());
      });
  }
};
