import { isAbsolute, join } from 'path';
import getAdminKey from '../shared/getAdminKey';
import loginToAzure from '../shared/loginToAzure';
import invokeFunction from './lib/invokeFunction';
import { Promise } from 'bluebird'

export default class AzureInvoke {
  serverless: any;
  options: any;
  provider: any;
  hooks: any;
  loginToAzure: any;
  getAdminKey: any;
  invokeFunction: any;

  constructor (serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
      loginToAzure,
      getAdminKey,
      invokeFunction
    );

    if (this.options.path) {
      const absolutePath = isAbsolute(this.options.path)
        ? this.options.path
        : join(this.serverless.config.servicePath, this.options.path);

      if (!this.serverless.utils.fileExistsSync(absolutePath)) {
        throw new this.serverless.classes.Error('The file you provided does not exist.');
      }
      this.options.data = this.serverless.utils.readFileSync(absolutePath);
    }

    this.hooks = {

      // TODO: See ./lib/invokeFunction.js:L10
      'before:invoke:invoke': () => Promise.bind(this)
         .then(this.provider.initialize(this.serverless,this.options))
         .then(this.loginToAzure)
         .then(this.getAdminKey),

      'invoke:invoke': () => Promise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options))
        .then(this.invokeFunction)
    };
  }
}
