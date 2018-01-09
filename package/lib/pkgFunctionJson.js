'use strict';
const fs = require('fs');
const path = require('path');
const BbPromise = require('bluebird');

module.exports = {
  pkgFunctionJson () {

    return new BbPromise((resolve) => {
      this.serverless.cli.log('We\'re hooked in!');
      resolve();
    })
    .then(() => {
      console.log('.webpack files:');
      const stats = this.compileStats;
      console.log('stats is', this.serverless.config.servicePath);
      if (fs.existsSync('.webpack')) {
        const files = fs.readdirSync('.webpack');
        files.forEach((file) => {
          console.log('webpack file: ', file);
          const dirPath = path.resolve('.webpack', file);
          const jsonFileName = `${file}-function.json`;
          const jsonFileSrcPath = path.join(this.serverless.config.servicePath, jsonFileName);
          const jsonFileDestPath = path.join(dirPath, jsonFileName);
          if (fs.statSync(dirPath).isDirectory()) {
            console.log('moving from:', jsonFileSrcPath, 'to:', jsonFileDestPath);
            fs.renameSync(jsonFileSrcPath, jsonFileDestPath);
          }
        });
      }
    })
    .then(() => {
      console.log('.serverless files:');
      if (fs.existsSync('.serverless')) {
        const files = fs.readdirSync('.serverless');
        files.forEach((file) => {
          console.log('serverless file: ', file);
        });
      }
    });
  }
};
