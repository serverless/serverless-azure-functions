import { Promise } from 'bluebird';
import { join } from 'path';

export default function uploadFunctions () {
  const createFunctionPromises = [];

  this.serverless.service.getAllFunctions().forEach((functionName) => {

    createFunctionPromises.push(this.provider.uploadFunction(functionName)
      .then(() => this.provider.runKuduCommand('mv '+ join(functionName, functionName +'-function.json') +' '+ join(functionName, 'function.json'))));
  });

  return Promise.all(createFunctionPromises)
          .then(() => this.provider.syncTriggers());
};