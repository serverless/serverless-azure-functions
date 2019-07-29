import {
  ArmResourceTemplateGenerator,
  ArmResourceTemplate,
  ArmResourceType
} from "../models/armTemplates";
import { Guard } from "../shared/guard";
import { ServerlessAzureConfig } from "../models/serverless";
import { Utils } from "../shared/utils";

export class CompositeArmTemplate implements ArmResourceTemplateGenerator {

  public getArmResourceType(): ArmResourceType {
    return ArmResourceType.Composite;
  }

  public constructor(private childTemplates: ArmResourceTemplateGenerator[]) {
    Guard.null(childTemplates);
  }

  public getTemplate(): ArmResourceTemplate {
    const template: ArmResourceTemplate = {
      $schema:
        "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      contentVersion: "1.0.0.0",
      parameters: {},
      resources: []
    };

    this.childTemplates.forEach(resource => {
      const resourceTemplate = resource.getTemplate();
      template.parameters = {
        ...template.parameters,
        ...resourceTemplate.parameters
      };

      template.resources = [
        ...template.resources,
        ...resourceTemplate.resources
      ];
    });

    return template;
  }

  public getParameters(config: ServerlessAzureConfig, namer: (resource: ArmResourceType) => string) {
    let parameters = {};

    this.childTemplates.forEach(resource => {
      parameters = {
        ...parameters,
        ...resource.getParameters(config, namer),
        location: Utils.getNormalizedRegionName(config.provider.region)
      };
    });

    return parameters;
  }
}
