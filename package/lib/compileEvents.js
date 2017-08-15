'use strict';

const BbPromise = require('bluebird');
const utils = require('../../shared/utils');

module.exports = {
  compileEvents() {
    const createEventsPromises = [];

    this.serverless.service.getAllFunctions().forEach((functionName) => {
      const metaData = utils.getFunctionMetaData(functionName, this.provider.getParsedBindings(), this.serverless);

      createEventsPromises.push(this.provider.createEventsBindings(functionName, metaData.entryPoint, metaData.handlerPath, metaData.params));
    });

    return BbPromise.all(createEventsPromises);
  }
};

