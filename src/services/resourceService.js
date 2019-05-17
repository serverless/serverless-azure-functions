import { ResourceManagementClient } from '@azure/arm-resources';

export class ResourceService {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.serviceName = serverless.service.service;
    this.credentials = serverless.variables.azureCredentials;
    this.subscriptionId = serverless.variables.subscriptionId;
    this.resourceGroup = serverless.service.provider.resourceGroup || `${this.serviceName}-rg`;
    this.deploymentName = serverless.service.provider.deploymentName || `${this.resourceGroup}-deployment`;

    this.resourceClient = new ResourceManagementClient(this.credentials, this.subscriptionId);
  }

  async deployResourceGroup() {
    this.serverless.cli.log(`Creating resource group: ${this.resourceGroup}`);

    const groupParameters = {
      location: this.serverless.service.provider.location
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