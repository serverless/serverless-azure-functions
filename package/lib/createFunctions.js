'use strict';

const BbPromise = require('bluebird');
const utils = require('../../shared/utils');
const fs = require('fs');
const JSZip = require('jszip');
const path = require('path');
const shell = require('shelljs');

module.exports = {
  createFunctions () {
    //console.log("createFunctions:config:", this.serverless.config);
    // console.log("createFunctions:package:", this.serverless.service.package.artifact);

    const zipFile = this.serverless.service.package.artifact;
    const preAddZipFile = `${zipFile}.preAdd`;
    const unlink = BbPromise.promisify(fs.unlink);
    const rename = BbPromise.promisify(fs.rename);
    //const readFile = BbPromise.promisify(fs.readFile);
    //  .then(readFile(preAddZipFile))
    // console.log("createFunctions:", preAddZipFile, zipFile);
    return unlink(preAddZipFile)
      .catch(error => {return})
      .then(rename(zipFile, preAddZipFile))
      .then(() => {
        return new BbPromise((res, rej) => {
          fs.readFile(preAddZipFile, (err, data) => res(data));
        });
      })
      .then((data, doof) => {
        const zip = new JSZip();
        return zip.loadAsync(data);
      })
      .then((zip) => {
        const createFunctionPromises = [];
        this.serverless.service.getAllFunctions().forEach((functionName) => {
          const metaData = utils.getFunctionMetaData(functionName, this.provider.getParsedBindings(), this.serverless);
          this.provider.createUploadFunction(zip, functionName, metaData.entryPoint, metaData.handlerPath, metaData.params);
        });
        return zip.generateNodeStream({streamFiles:true, compression: 'DEFLATE'})
          .pipe(fs.createWriteStream(zipFile))
      });
  }
};
