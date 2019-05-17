'use strict';
const path = require('path');

module.exports = {
  uploadFunction () {
    const functionName = this.options.function;

    return this.provider.uploadFunction(functionName)
      .then(() => this.provider.runKuduCommand('mv '+ path.join(functionName, functionName +'-function.json') +' '+ path.join(functionName, 'function.json')))
      .then(() => this.provider.syncTriggers());
  }
};
