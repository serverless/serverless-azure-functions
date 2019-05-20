
import { Promise } from 'bluebird';
import AzureProvider from '../../provider/azureProvider';
const deleteResourceGroup = require('./lib/deleteResourceGroup');

class AzureRemove {
  provider: AzureProvider;
  hooks: any;
  deleteResourceGroup: any;

  constructor (private serverless, private options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      deleteResourceGroup
    );

    this.hooks = {
      'remove:remove': () => Promise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options))
        .then(this.deleteResourceGroup)
        .then(() => this.serverless.cli.log('Service successfully removed'))
    };
  }
}

module.exports = AzureRemove;
