import Serverless from "serverless";
import { Deployment, DeploymentExtended } from "@azure/arm-resources/esm/models";
import { BaseService } from "./baseService";
import { ResourceManagementClient } from "@azure/arm-resources";
import { Guard } from "../shared/guard";
import { ServerlessAzureConfig } from "../models/serverless";
import fs from "fs";

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

    if (this.config.provider.apim) {
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

    const deploymentParameters = {};
    Object.keys(deployment.parameters).forEach((key) => {
      const parameterValue = deployment.parameters[key];
      if (parameterValue) {
        deploymentParameters[key] = { value: deployment.parameters[key] };
      }
    });

    this.serverless.cli.log(JSON.stringify(deploymentParameters, null, 4));
    fs.writeFileSync(".serverless/arm-template.json", JSON.stringify(deployment.template, null, 4));

    const armDeployment: Deployment = {
      properties: {
        mode: "Incremental",
        template: deployment.template,
        parameters: deploymentParameters,
      }
    };

    // Deploy ARM template
    const result = await this.resourceClient.deployments.createOrUpdate(this.resourceGroup, this.deploymentName, armDeployment);
    this.serverless.cli.log("ARM deployment complete");

    return result;
  }
}