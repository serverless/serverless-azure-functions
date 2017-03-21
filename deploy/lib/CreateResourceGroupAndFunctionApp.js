'use strict';

module.exports = {
  CreateResourceGroupAndFunctionApp() {
    this.provider.initialise(this.serverless, this.options);

    return this.provider.CreateResourceGroup()
      .then(() => this.provider.CreateFunctionApp());
  }
};

