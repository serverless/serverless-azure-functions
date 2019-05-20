import { Promise } from "bluebird";
import retrieveLogs from './retrieveLogs';
import loginToAzure from '../shared/loginToAzure';

export class AzureLogs {
  serverless: any;
  options: any;
  provider: any;
  hooks: any;
  loginToAzure: any;
  retrieveLogs: any;

  constructor (serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      loginToAzure,
      retrieveLogs
    );

    this.hooks = {
      'before:logs:logs': () => Promise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options))
        .then(this.loginToAzure),

      'logs:logs': () => Promise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options))
        .then(this.retrieveLogs)
    };
  }
}
