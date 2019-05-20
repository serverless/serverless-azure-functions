import { Promise } from 'bluebird';
import CreateResourceGroupAndFunctionApp from './CreateResourceGroupAndFunctionApp';
import uploadFunctions from './uploadFunctions';
import cleanUpFunctions from './cleanUpFunctions';
import loginToAzure from '../shared/loginToAzure';

export class AzureDeploy {
  serverless: any;
  options: any;
  provider: any;
  hooks: any;
  loginToAzure: any;
  cleanUpFunctions: any;
  CreateResourceGroupAndFunctionApp: any;
  uploadFunctions: any;

  constructor (serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      loginToAzure,
      cleanUpFunctions,
      CreateResourceGroupAndFunctionApp,
      uploadFunctions
    );

    this.hooks = {
      'before:deploy:deploy': () => Promise.bind(this)
        .then(this.provider.initialize(this.serverless, this.options))
        .then(this.loginToAzure)
        .then(this.cleanUpFunctions),

      'deploy:deploy': () => Promise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options))
        .then(this.CreateResourceGroupAndFunctionApp)
        .then(this.uploadFunctions)
        .then(() => this.serverless.cli.log('Successfully created Function App'))
    };
  }
}
