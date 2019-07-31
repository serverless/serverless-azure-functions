import Serverless from "serverless";
import { ResourceManagementClient } from "@azure/arm-resources";
import { BaseService } from "./baseService";
import { Utils } from "../shared/utils";
import { AzureNamingService } from "./namingService";

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
   * Returns stringified list of deployments with timestamps
   */
  public async listDeployments(): Promise<string> {
    const deployments = await this.getDeployments()
    if (!deployments || deployments.length === 0) {
      this.log(`No deployments found for resource group '${this.getResourceGroupName()}'`);
      return;
    }
    let stringDeployments = "\n\nDeployments";

    for (const dep of deployments) {
      stringDeployments += "\n-----------\n"
      stringDeployments += `Name: ${dep.name}\n`
      const timestampFromName = Utils.getTimestampFromName(dep.name);
      stringDeployments += `Timestamp: ${(timestampFromName) ? timestampFromName : "None"}\n`;

      const dateTime = timestampFromName ? new Date(+timestampFromName).toISOString() : "None";
      stringDeployments += `Datetime: ${dateTime}\n`
    }

    stringDeployments += "-----------\n"
    return stringDeployments
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
      location: AzureNamingService.getNormalizedRegionName(this.getRegion()),
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
