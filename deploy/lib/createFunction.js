'use strict';

const utils = require('../../shared/utils');

module.exports = {
  createFunction () {
    const functionName = this.options.function;
    const metaData = utils.getFunctionMetaData(functionName, this.provider.getParsedBindings(), this.serverless);

    return this.provider.createZipObjectAndUploadFunction(functionName, metaData.entryPoint, metaData.handlerPath, metaData.params)
      .then(() => this.provider.syncTriggers());
  }
};
