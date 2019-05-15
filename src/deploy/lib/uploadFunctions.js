'use strict';

const BbPromise = require('bluebird');
const path = require('path');

module.exports = {
  uploadFunctions () {
    const createFunctionPromises = [];

    this.serverless.service.getAllFunctions().forEach((functionName) => {

      createFunctionPromises.push(this.provider.uploadFunction(functionName)
        .then(() => this.provider.runKuduCommand('mv '+ path.join(functionName, functionName +'-function.json') +' '+ path.join(functionName, 'function.json'))));
    });

    return BbPromise.all(createFunctionPromises)
            .then(() => this.provider.syncTriggers());
  }
};
