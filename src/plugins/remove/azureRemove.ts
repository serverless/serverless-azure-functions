import * as Serverless from 'serverless';
import { deleteResourceGroup } from './lib/deleteResourceGroup';

export class AzureRemove {
  public hooks: { [eventName: string]: Promise<any> };
  deleteResourceGroup: () => Promise<any>;

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    Object.assign(
      this,
      deleteResourceGroup
    );

    this.hooks = {
      'remove:remove': this.deleteResourceGroup.bind(this)
    };
  }

  private async remove() {
    await this.deleteResourceGroup();
    this.serverless.cli.log('Service successfully removed');
  }
}
