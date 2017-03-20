'use strict';

const BbPromise = require('bluebird');
const utils = require('../../shared/utils');
const fs = require('fs');
const path = require('path');

module.exports = {
  createFunctions () {
    const createFunctionPromises = [];

    this.serverless.service.getAllFunctions().forEach((functionName) => {
      const metaData = utils.getFunctionMetaData(functionName, this.provider.getParsedBindings(), this.serverless);

      createFunctionPromises.push(this.provider.createZipObjectAndUploadFunction(functionName, metaData.entryPoint, metaData.handlerPath, metaData.params));
    });
    
    const packageJsonFilePath = path.join(this.serverless.config.servicePath, 'package.json');
    let createFunctionsPromise = BbPromise.all(createFunctionPromises)
                                .then(() => this.provider.syncTriggers())
                                .then(() => this.provider.runKuduCommand('del package.json'));
   
    if (fs.existsSync(packageJsonFilePath)) {
      return createFunctionsPromise.then(() => this.provider.uploadPackageJson())
            .then(() => this.provider.runKuduCommand('npm install --production'));
    }
    else{
      return createFunctionsPromise.then(() => this.provider.runKuduCommand('rmdir /s /q node_modules'))
    }
  }
};
