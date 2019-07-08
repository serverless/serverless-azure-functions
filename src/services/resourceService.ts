import Serverless from "serverless";
import { ResourceManagementClient } from "@azure/arm-resources";
import { BaseService } from "./baseService";
import { Utils } from "../shared/utils";

export class ResourceService extends BaseService {
  private resourceClient: ResourceManagementClient;

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);

    this.resourceClient = new ResourceManagementClient(this.credentials, this.subscriptionId);
  }

  /**
   * Get all deployments for resource group
   */
  public async getDeployments() {
    this.log(`Listing deployments for resource group '${this.resourceGroup}':`);
    return await this.resourceClient.deployments.listByResourceGroup(this.resourceGroup);
  }

  /**
   * Get ARM template for previous deployment
   * @param deploymentName Name of deployment
   */
  public async getDeploymentTemplate(deploymentName: string) {
    return await this.resourceClient.deployments.exportTemplate(this.resourceGroup, deploymentName);
  }

  public async deployResourceGroup() {
    this.log(`Creating resource group: ${this.resourceGroup}`);

    return await this.resourceClient.resourceGroups.createOrUpdate(this.resourceGroup, {
      location: Utils.getNormalizedRegionName(this.getRegion()),
    });
  }

  public async deleteDeployment() {
    this.log(`Deleting deployment: ${this.deploymentName}`);
    return await this.resourceClient.deployments.deleteMethod(this.resourceGroup, this.deploymentName);
  }

  public async deleteResourceGroup() {
    this.log(`Deleting resource group: ${this.resourceGroup}`);
    return await this.resourceClient.resourceGroups.deleteMethod(this.resourceGroup);
  }
}