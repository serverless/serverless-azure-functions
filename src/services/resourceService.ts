import * as Serverless from 'serverless';
import { ResourceManagementClient } from '@azure/arm-resources';
import { BaseService } from './baseService';

export class ResourceService extends BaseService {
  private resourceClient: ResourceManagementClient;

  constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);

    this.resourceClient = new ResourceManagementClient(this.credentials, this.subscriptionId);
  }

  async deployResourceGroup() {
    this.serverless.cli.log(`Creating resource group: ${this.resourceGroup}`);

    const groupParameters = {
      location: this.serverless.service.provider['location']
    };

    return await this.resourceClient.resourceGroups.createOrUpdate(this.resourceGroup, groupParameters);
  }

  async deleteDeployment() {
    this.serverless.cli.log(`Deleting deployment: ${this.deploymentName}`);
    return await this.resourceClient.deployments.deleteMethod(this.resourceGroup, this.deploymentName);
  }

  async deleteResourceGroup() {
    this.serverless.cli.log(`Deleting resource group: ${this.resourceGroup}`);
    return await this.resourceClient.resourceGroups.deleteMethod(this.resourceGroup);
  }
}