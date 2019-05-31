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

  public async deployResourceGroup() {
    this.log(`Creating resource group: ${this.resourceGroup}`);

    this.serverless.cli.log(Utils.prettyPrint(this.serverless.service.provider));

    const groupParameters = {
      location: this.getRegion()
    };

    return await this.resourceClient.resourceGroups.createOrUpdate(this.resourceGroup, groupParameters);
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