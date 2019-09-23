import { DeploymentExtended } from "@azure/arm-resources/esm/models";
import path from "path";
import Serverless from "serverless";
import { Utils } from "../shared/utils";
import { ArmService } from "./armService";
import { AzureBlobStorageService } from "./azureBlobStorageService";
import { BaseService } from "./baseService";
import { FunctionAppService } from "./functionAppService";
import { ResourceService } from "./resourceService";
import { ArmDeployment, ArmParamType } from "../models/armTemplates";
import fs from "fs";

/**
 * Services for the Rollback Plugin
 */
export class RollbackService extends BaseService {
  private resourceService: ResourceService;
  private blobService: AzureBlobStorageService;

  /**
   * Initialize rollback service, including authentication and initialization
   * of a `ResourceService`
   * @param serverless Serverless object
   * @param options Serverless CLI options
   */
  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
    this.resourceService = new ResourceService(serverless, options);
    this.blobService = new AzureBlobStorageService(serverless, options);
  }

  /**
   * Rolls back the function app. If `timestamp` present in `options`,
   * function app will be rolled back directly to that timestamp. Otherwise,
   * function app will be rolled back to the deployment previous to the most recent
   */
  public async rollback() {
    // Get deployment as specified by timestamp
    const deployment = await this.getDeployment();
    if (!deployment) {
      return;
    }
    // Name of artifact in blob storage
    const artifactName = this.configService.getArtifactName(deployment.name);
    // Redeploy resource group (includes SAS token URL if running from blob URL)
    await this.redeployDeployment(deployment, artifactName);
  }

  /**
   * Re-deploy a previous deployment of a resource group
   * @param deployment Previous deployment retrieved from Azure SDK
   * @param artifactName Name of zipped artifact in blob storage associated with deployment
   */
  private async redeployDeployment(deployment: DeploymentExtended, artifactName: string) {
    const armService = new ArmService(this.serverless, this.options);
    const armDeployment = await this.convertToArmDeployment(deployment);
    // Initialize blob service for either creating SAS token or downloading artifact to uplod to function app
    await this.blobService.initialize();
    if (this.config.provider.deployment.runFromBlobUrl) {
      // Set functionRunFromPackage param to SAS URL of blob
      armDeployment.parameters.functionAppRunFromPackage = {
        type: ArmParamType.String,
        value: await this.blobService.generateBlobSasTokenUrl(
          this.config.provider.deployment.container,
          artifactName
        )
      }
    }
    await armService.deployTemplate(armDeployment);
    /**
     * Cannot use an `else` statement just because deploying the artifact
     * depends on `deployTemplate` already being called
     */
    if (!this.config.provider.deployment.runFromBlobUrl) {
      const artifactPath = await this.downloadArtifact(artifactName);
      await this.redeployArtifact(artifactPath);
    }
  }

  /**
   * Convert previous deployment to ArmDeployment
   * @param deployment Previous deployment retrieved from Azure SDK
   */
  private async convertToArmDeployment(deployment: DeploymentExtended): Promise<ArmDeployment> {
    const resourceService = new ResourceService(this.serverless, this.options);
    const { template } = await resourceService.getDeploymentTemplate(deployment.name);
    const { parameters } = deployment.properties;
    return {
      template,
      parameters,
    }
  }

  /**
   * Deploy zipped artifact to function app
   * @param artifactPath Path to downloaded zipped artifact
   */
  private async redeployArtifact(artifactPath: string) {
    const functionAppService = new FunctionAppService(this.serverless, this.options);
    const functionApp = await functionAppService.get();
    await functionAppService.uploadZippedArfifactToFunctionApp(functionApp, artifactPath);
    if (fs.existsSync(artifactPath)) {
      fs.unlinkSync(artifactPath);
    }
  }

  /**
   * Get deployment specified by timestamp in Serverless options
   * Lists deployments if no timestamp is provided
   */
  private async getDeployment(): Promise<DeploymentExtended> {
    let timestamp = Utils.get(this.options, "timestamp");
    if (!timestamp) {
      this.log("Need to specify a timestamp for rollback.\n\n" +
        "Example usage:\n\nsls rollback -t 1562014362\n\n" +
        await this.resourceService.listDeployments());
      return;
    }
    const deployments = await this.getArmDeploymentsByTimestamp();
    const deployment = deployments.get(timestamp);
    if (!deployment) {
      this.log(`Couldn't find deployment with timestamp: ${timestamp}`);
      this.log(`Timestamps: ${Array.from(deployments.keys()).map((key) => `\n${key}`)}`)
    }
    return deployment;
  }

  /**
   * Download zipped function app artifact from blob storage corresponding to the specified deployment
   * @param artifactName Name of artifact to download
   */
  private async downloadArtifact(artifactName: string): Promise<string> {
    const artifactPath = path.join(this.serverless.config.servicePath, ".serverless", artifactName)
    await this.blobService.downloadBinary(
      this.config.provider.deployment.container,
      artifactName,
      artifactPath
    );
    return artifactPath;
  }

  /**
   * Get all deployments of a resource group indexed by Unix timestamp string
   */
  private async getArmDeploymentsByTimestamp(): Promise<Map<string, DeploymentExtended>> {
    const result = new Map<string, DeploymentExtended>();
    const armDeployments = await this.resourceService.getDeployments();
    for (const armDeployment of armDeployments) {
      const timestamp = Utils.getTimestampFromName(armDeployment.name);
      if (timestamp) {
        result.set(timestamp, armDeployment);
      }
    }
    return result;
  }
}
