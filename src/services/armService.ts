import Serverless from "serverless";
import { Deployment, DeploymentsCreateOrUpdateResponse, DeploymentExtended } from "@azure/arm-resources/esm/models";
import { BaseService } from "./baseService";
import { ResourceManagementClient } from "@azure/arm-resources";
import { Guard } from "../shared/guard";
import { ServerlessAzureConfig } from "../models/serverless";

export interface ArmResourceTemplateGenerator {
  getTemplate(): ArmResourceTemplate;
  getParameters(config: ServerlessAzureConfig): any;
}

export interface ArmResourceTemplate {
  $schema: string;
  contentVersion: string;
  parameters: {
    [key: string]: any;
  };
  resources: any[];
  variables?: any;
}

export interface ArmDeployment {
  template: any;
  parameters: { [key: string]: any };
}

export class ArmService extends BaseService {
  private resourceClient: ResourceManagementClient;

  public constructor(serverless: Serverless) {
    super(serverless);
    this.resourceClient = new ResourceManagementClient(this.credentials, this.subscriptionId);
  }

  public async createDeployment(type: string): Promise<ArmDeployment> {
    Guard.empty(type);

    const { ApimResource } = await import("../armTemplates/resources/apim");
    let template: ArmResourceTemplateGenerator;

    try {
      template = (await import(`../armTemplates/${type}`)).default;
    } catch (e) {
      throw new Error(`Unable to find template with name ${type} `);
    }

    const azureConfig: ServerlessAzureConfig = this.serverless.service as any;

    const mergedTemplate = template.getTemplate();
    let parameters = template.getParameters(azureConfig);

    if (this.serverless.service.provider["apim"]) {
      const apimTemplate = ApimResource.getTemplate();
      const apimParameters = ApimResource.getParameters(azureConfig);

      mergedTemplate.parameters = {
        ...mergedTemplate.parameters,
        ...apimTemplate.parameters,
      };
      mergedTemplate.resources = [
        ...mergedTemplate.resources,
        ...apimTemplate.resources,
      ];

      parameters = {
        ...parameters,
        ...apimParameters,
      };
    }

    return {
      template: mergedTemplate,
      parameters,
    };
  }

  public async deployTemplate(deployment: ArmDeployment): Promise<DeploymentExtended> {
    Guard.null(deployment);

    const deploymentParameters: Deployment = {
      properties: {
        mode: "Incremental",
        template: deployment.template,
        parameters: deployment.parameters,
      }
    };

    // Deploy ARM template
    return await this.resourceClient.deployments.createOrUpdate(this.resourceGroup, this.deploymentName, deploymentParameters);
  }
}