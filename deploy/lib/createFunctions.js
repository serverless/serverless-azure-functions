'use strict';

const BbPromise = require('bluebird');
const utils = require('../../shared/utils');

module.exports = {
  createFunctions() {
    this.provider.initialise(this.serverless, this.options);

    const createFunctionPromises = [];

    this.serverless.service.getAllFunctions().forEach((functionName) => {
      const metaData = utils.getFunctionMetaData(functionName, this.provider.getParsedBindings(), this.serverless);

      createFunctionPromises.push(this.provider.createZipObject(functionName, metaData.entryPoint, metaData.handlerPath, metaData.params));
    });

    return BbPromise.all(createFunctionPromises)
      .then(() => this.provider.createAndUploadZipFunctions())
      .then(() => this.provider.syncTriggers())
      .then(() => this.provider.runKuduCommand('del package.json'))
      .then(() => this.provider.uploadPackageJson())
      .then(() => this.provider.runKuduCommand('npm install --production'));
  }
};
