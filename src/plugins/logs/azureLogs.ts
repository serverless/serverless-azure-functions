
import { Promise } from 'bluebird';
import AzureProvider from '../../provider/azureProvider';
const retrieveLogs = require('./lib/retrieveLogs');

export class AzureLogs {
  provider: AzureProvider
  hooks: any;
  retrieveLogs: any;

  constructor (private serverless, private options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      retrieveLogs
    );

    this.hooks = {
      'before:logs:logs': () => Promise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options)),

      'logs:logs': () => Promise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options))
        .then(this.retrieveLogs)
    };
  }
}
