'use strict';

module.exports = {
  deleteResourceGroup () {
    return this.provider.LoginWithServicePrincipal()
      .then(() => this.provider.DeleteDeployment())
      .then(() => this.provider.DeleteResourceGroup());
  }
};
