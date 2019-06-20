import Serverless from "serverless";
import { Deployment } from "@azure/arm-resources/esm/models";
import { BaseService } from "./baseService";
import { ResourceManagementClient } from "@azure/arm-resources";
import { Guard } from "../shared/guard";

export interface ArmTemplateGenerator {
  generate(): any;
}

export class ArmService extends BaseService {
  private resourceClient: ResourceManagementClient;

  public constructor(serverless: Serverless) {
    super(serverless);
    this.resourceClient = new ResourceManagementClient(this.credentials, this.subscriptionId);
  }

  public async createTemplate(type: string): Promise<any> {
    Guard.empty(type);

    const apim = await import("../armTemplates/resources/apim.json");
    let template: ArmTemplateGenerator;

    try {
      template = await import(`../armTemplates/${type}`);
    } catch (e) {
      throw new Error(`Unable to find template with name ${type} `);
    }

    const mergedTemplate = template.generate();

    if (this.serverless.service.provider["apim"]) {
      mergedTemplate.parameters = {
        ...mergedTemplate.parameters,
        ...apim.parameters,
      };
      mergedTemplate.resources = [
        ...mergedTemplate.resources,
        ...apim.resources,
      ]
    }

    return mergedTemplate;
  }

  public async deployTemplate(template: any, parameters: string[]) {
    Guard.null(template);
    Guard.null(parameters);

    const deploymentParameters: Deployment = {
      properties: {
        mode: "Incremental",
        parameters,
        template
      }
    };

    // Deploy ARM template
    await this.resourceClient.deployments.createOrUpdate(this.resourceGroup, this.deploymentName, deploymentParameters);
  }
}