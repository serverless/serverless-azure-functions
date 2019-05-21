import * as fs from 'fs';
import { join } from 'path';

export function webpackFunctionJson(): Promise<any> {
  const webpackJsonPromises = [];

  if (fs.existsSync('.webpack')) {
    this.serverless.service.getAllFunctions().forEach((functionName) => {
      webpackJsonPromises.push(moveJsonFile.call(this, functionName));
    });
  }

  return Promise.all(webpackJsonPromises);
}

function moveJsonFile(functionName): Promise<any> {
  const dirPath = join(this.serverless.config.servicePath, '.webpack', functionName);
  const jsonFileName = `${functionName}-function.json`;
  const jsonFileSrcPath = join(this.serverless.config.servicePath, jsonFileName);
  const jsonFileDestPath = join(dirPath, jsonFileName);

  return new Promise((resolve) => {
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
}
