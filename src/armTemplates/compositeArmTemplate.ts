import { ArmResourceTemplate, ArmResourceTemplateGenerator, ArmParameters, ArmParamType } from "../models/armTemplates";
import { ServerlessAzureConfig } from "../models/serverless";
import { AzureNamingService } from "../services/namingService";
import { Guard } from "../shared/guard";

export class CompositeArmTemplate implements ArmResourceTemplateGenerator {
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

  public getParameters(config: ServerlessAzureConfig): ArmParameters {
    let parameters: ArmParameters = {};

    this.childTemplates.forEach(resource => {
      parameters = {
        ...parameters,
        ...resource.getParameters(config),
        location: {
          value: AzureNamingService.getNormalizedRegionName(config.provider.region)
        }
      };
    });

    return parameters;
  }
}
