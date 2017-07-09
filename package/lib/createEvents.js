'use strict';

const BbPromise = require('bluebird');
const utils = require('../../shared/utils');
const fs = require('fs');
const JSZip = require('jszip');
const path = require('path');
const shell = require('shelljs');

module.exports = {
  createEvents () {
    //console.log("createFunctions:config:", this.serverless.config);
    // console.log("createEvents:package:", this.serverless.service.package.artifact);

    // this.serverless.service.getAllEvents().forEach((eventName) => {
    //   console.log("Events:", eventName)
    // });
    return new BbPromise(function (resolve, reject) {
      // console.log("Events has been Resolved");
      resolve();
    })
  }
};
