import Serverless from "serverless";
import { ResourceManagementClient } from "@azure/arm-resources";
import { BaseService } from "./baseService";
import { Utils } from "../shared/utils";
import { AzureNamingService } from "./namingService";
import { ArmDeployment, ArmTemplateProvisioningState } from "../models/armTemplates";
import { DeploymentExtended } from "@azure/arm-resources/esm/models";

export class ResourceService extends BaseService {
  private resourceClient: ResourceManagementClient;

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);

    this.resourceClient = new ResourceManagementClient(this.credentials, this.subscriptionId);
  }

  /**
   * Get all deployments for resource group sorted by timestamp (most recent first)
   */
  public async getDeployments() {
    this.log(`Listing deployments for resource group '${this.resourceGroup}':`);
    const deployments = await this.resourceClient.deployments.listByResourceGroup(this.resourceGroup);
    return deployments.sort((a: DeploymentExtended, b: DeploymentExtended) => {
      return (a.properties.timestamp > b.properties.timestamp) ? 1 : -1
    });
  }

  /**
   * Get the most recent resource group deployment
   */
  public async getPreviousDeployment() {
    const deployments = await this.getDeployments();
    if (deployments && deployments.length) {
      return deployments[0];
    }
  }

  /**
   * Get template from last resource group deployment
   */
  public async getPreviousDeploymentTemplate(): Promise<ArmDeployment> {
    const deployment = await this.getPreviousDeployment();
    if (!deployment || deployment.properties.provisioningState !== ArmTemplateProvisioningState.SUCCEEDED) {
      return;
    }
    const { parameters } = deployment.properties;
    const { template } = await this.getDeploymentTemplate(deployment.name);
    return {
      template,
      parameters
    }
  }

  /**
   * Returns stringified list of deployments with timestamps
   */
  public async listDeployments(): Promise<string> {
    const deployments = await this.getDeployments()
    if (!deployments || deployments.length === 0) {
      this.log(`No deployments found for resource group '${this.configService.getResourceGroupName()}'`);
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
      location: AzureNamingService.getNormalizedRegionName(this.configService.getRegion()),
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
