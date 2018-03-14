'use strict';
const fs = require('fs');
const path = require('path');
const BbPromise = require('bluebird');

module.exports = {
  webpackFunctionJson () {
    const webpackJsonPromises = [];

    if (fs.existsSync('.webpack')) {
      this.serverless.service.getAllFunctions().forEach((functionName) => {
        webpackJsonPromises.push(moveJsonFile.call(this, functionName));
      });
    }

    return BbPromise.all(webpackJsonPromises);
  }
};

function moveJsonFile(functionName) {
  const dirPath = path.join(this.serverless.config.servicePath, '.webpack', functionName);
  const jsonFileName = `${functionName}-function.json`;
  const jsonFileSrcPath = path.join(this.serverless.config.servicePath, jsonFileName);
  const jsonFileDestPath = path.join(dirPath, jsonFileName);

  const fileMovedPromise = new BbPromise((resolve) => {
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      if (fs.existsSync(jsonFileSrcPath)) {
        this.serverless.cli.log(`Moving ${jsonFileName} to .webpack directory.`);
        fs.renameSync(jsonFileSrcPath, jsonFileDestPath);
      }
      else {
        this.serverless.cli.log(`Warning: No generated ${functionName}-function.json file was found. It will not be included in the package.`);
      }
    }

    resolve();
  });

  return fileMovedPromise;
}
