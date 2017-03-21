'use strict';

module.exports = {
  retrieveLogs() {
    this.provider.initialise(this.serverless, this.options);

    const functionName = this.options.function;

    return this.provider.getAdminKey()
      .then(() => this.provider.pingHostStatus(functionName))
      .then(() => this.provider.getLogsStream(functionName));
  }
};
