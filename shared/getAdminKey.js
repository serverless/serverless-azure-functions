'use strict';

module.exports = {
  getAdminKey () {
    this.provider.initialise(this.serverless, this.options);
    return this.provider.getAdminKey();
  }
};
