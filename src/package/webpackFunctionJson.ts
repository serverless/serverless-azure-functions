import { existsSync, statSync, renameSync } from 'fs';
import { join } from 'path';
import { Promise } from 'bluebird'

export default function webpackFunctionJson () {
  const webpackJsonPromises = [];

  if (existsSync('.webpack')) {
    this.serverless.service.getAllFunctions().forEach((functionName) => {
      webpackJsonPromises.push(moveJsonFile.call(this, functionName));
    });
  }

  return Promise.all(webpackJsonPromises);
};

function moveJsonFile(functionName) {
  const dirPath = join(this.serverless.config.servicePath, '.webpack', functionName);
  const jsonFileName = `${functionName}-function.json`;
  const jsonFileSrcPath = join(this.serverless.config.servicePath, jsonFileName);
  const jsonFileDestPath = join(dirPath, jsonFileName);

  const fileMovedPromise = new Promise((resolve) => {
    if (existsSync(dirPath) && statSync(dirPath).isDirectory()) {
      if (existsSync(jsonFileSrcPath)) {
        this.serverless.cli.log(`Moving ${jsonFileName} to .webpack directory.`);
        renameSync(jsonFileSrcPath, jsonFileDestPath);
      }
      else {
        this.serverless.cli.log(`Warning: No generated ${functionName}-function.json file was found. It will not be included in the package.`);
      }
    }

    resolve();
  });

  return fileMovedPromise;
}