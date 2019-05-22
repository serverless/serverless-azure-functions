import * as Serverless from 'serverless';
import { ResourceService } from '../../services/resourceService';

export class AzureRemove {
  public hooks: { [eventName: string]: Promise<any> };
  private resourceClient: ResourceService;

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.resourceClient = new ResourceService(this.serverless, this.options);

    this.hooks = {
      'remove:remove': this.remove.bind(this)
    };
  }

  private async remove() {
    await this.resourceClient.deleteDeployment();
    await this.resourceClient.deleteResourceGroup();

    this.serverless.cli.log('Service successfully removed');
  }
}
