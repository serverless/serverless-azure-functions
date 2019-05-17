import { Promise } from 'bluebird';
import deleteResourceGroup from './lib/deleteResourceGroup';
import loginToAzure from '../shared/loginToAzure';

export class AzureRemove {
  serverless: any;
  options: any;
  provider: any;
  hooks: any;
  loginToAzure: any;
  deleteResourceGroup: any;

  constructor (serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      loginToAzure,
      deleteResourceGroup
    );

    this.hooks = {
      'remove:remove': () => Promise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options))
        .then(this.loginToAzure)
        .then(this.deleteResourceGroup)
        .then(() => this.serverless.cli.log('Service successfully removed'))
    };
  }
}
