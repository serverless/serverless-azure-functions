'use strict';

module.exports = {
  CreateResourceGroupAndFunctionApp () {
    return this.provider.CreateResourceGroup()
      .then(() => this.provider.CreateFunctionApp());
  }
};
