'use strict';

const utils = require('../../shared/utils');

module.exports = {
  createFunction() {
    this.provider.initialise(this.serverless, this.options);

    const functionName = this.options.function;
    const metaData = utils.getFunctionMetaData(functionName, this.provider.getParsedBindings(), this.serverless);

    return this.provider.createZipObject(functionName, metaData.entryPoint, metaData.handlerPath, metaData.params)
      .then(() => this.provider.createAndUploadZipFunctions())
      .then(() => this.provider.syncTriggers());
  }
};
