import { Promise } from 'bluebird';
import uploadFunction from './lib/uploadFunction';
import loginToAzure from '../shared/loginToAzure';

export default class AzureDeployFunction {
  serverless: any;
  options: any;
  provider: any;
  hooks: any;

  loginToAzure: any;
  cleanUpFunctions: any;
  CreateResourceGroupAndFunctionApp: any;
  uploadFunction: any;
  uploadFunctions: any;

  constructor (serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      loginToAzure,
      uploadFunction
    );

    this.hooks = {
      // Spawn 'package:function' to create the single-function zip artifact
      'deploy:function:packageFunction': () => this.serverless.pluginManager
          .spawn('package:function'),

      'deploy:function:deploy': () => Promise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options))
        .then(this.loginToAzure)
        .then(this.uploadFunction)
        .then(() => this.serverless.cli.log('Successfully uploaded Function'))
    };
  }
}
