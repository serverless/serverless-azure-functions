'use strict';

module.exports = {
  deleteResourceGroup() {
    this.provider.initialise(this.serverless, this.options);

    return this.provider.LoginWithServicePrincipal()
      .then(() => this.provider.DeleteDeployment())
      .then(() => this.provider.DeleteResourceGroup());
  }
};
