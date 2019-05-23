import Serverless from 'serverless';
import { ResourceService } from '../../services/resourceService';

export class AzureRemove {
  public hooks: { [eventName: string]: Promise<any> };

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      'remove:remove': this.remove.bind(this)
    };
  }

  private async remove() {
    const resourceClient = new ResourceService(this.serverless, this.options);
    await resourceClient.deleteDeployment();
    await resourceClient.deleteResourceGroup();

    this.serverless.cli.log('Service successfully removed');
  }
}
