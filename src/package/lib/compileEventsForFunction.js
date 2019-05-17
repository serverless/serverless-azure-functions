'use strict';

const utils = require('../../shared/utils');

module.exports = {
  compileEventsForFunction() {
    const functionName = this.options.function;
    const metaData = utils.getFunctionMetaData(functionName, this.provider.getParsedBindings(), this.serverless);

    return this.provider.createEventsBindings(functionName, metaData.entryPoint, metaData.handlerPath, metaData.params);
  }
};

