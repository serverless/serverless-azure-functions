import * as Serverless from 'serverless';
import { deleteResourceGroup } from './lib/deleteResourceGroup';

export class AzureRemove {
  public hooks: { [eventName: string]: Promise<any> };
  deleteResourceGroup = deleteResourceGroup;

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      'remove:remove': this.remove.bind(this)
    };
  }

  private async remove() {
    await this.deleteResourceGroup();
    this.serverless.cli.log('Service successfully removed');
  }
}
