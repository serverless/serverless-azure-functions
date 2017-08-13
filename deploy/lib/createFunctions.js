'use strict';

const BbPromise = require('bluebird');
const fs = require('fs');
const path = require('path');

module.exports = {
  createFunctions () {
    const createFunctionPromises = [];

    this.serverless.service.getAllFunctions().forEach((functionName) => {

      createFunctionPromises.push(this.provider.uploadFunction(functionName)
        .then(() => this.provider.runKuduCommand('mv '+ path.join(functionName, functionName +'-function.json') +' '+ path.join(functionName, 'function.json'))));
    });

    const packageJsonFilePath = path.join(this.serverless.config.servicePath, 'package.json');
    let createFunctionsPromise = BbPromise.all(createFunctionPromises)
                                .then(() => this.provider.syncTriggers())
                                .then(() => this.provider.runKuduCommand('del package.json'));

    if (fs.existsSync(packageJsonFilePath)) {
      return createFunctionsPromise.then(() => this.provider.uploadPackageJson())
            .then(() => this.provider.runKuduCommand('npm install --production'));
    }
    else {
      return createFunctionsPromise.then(() => this.provider.runKuduCommand('rmdir /s /q node_modules'));
    }
  }
};
