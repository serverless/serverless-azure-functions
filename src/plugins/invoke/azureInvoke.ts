
import { Promise } from 'bluebird';
const invokeFunction = require('./lib/invokeFunction');
const getAdminKey = require('../../shared/getAdminKey');
import { join, isAbsolute } from 'path';

export class AzureInvoke {
  hooks: any;
  provider: any;
  invokeFunction: any;
  getAdminKey: any;

  constructor (private serverless, private options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('azure');

    Object.assign(
      this,
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
         .then(this.getAdminKey),

      'invoke:invoke': () => Promise.bind(this)
        .then(this.provider.initialize(this.serverless,this.options))
        .then(this.invokeFunction)
    };
  }
}
