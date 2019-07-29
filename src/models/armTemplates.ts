import { ServerlessAzureConfig } from "./serverless";

export enum ArmResourceType {
  Apim,
  AppInsights,
  AppServicePlan,
  FunctionApp,
  HostingEnvironment,
  StorageAccount,
  VirtualNetwork,
  Composite
}

/**
 * ARM Resource Template Generator
 */
export interface ArmResourceTemplateGenerator {
  getArmResourceType(): ArmResourceType;
  getTemplate(): ArmResourceTemplate;
  getParameters(config: ServerlessAzureConfig, namer: (resource: ArmResourceType) => string): any;
}

/**
 * The well-known serverless Azure template types
 */
export enum ArmTemplateType {
  Consumption = "consumption",
  Premium = "premium",
  AppServiceEnvironment = "ase",
}

/**
 * Represents an Azure ARM template
 */
export interface ArmResourceTemplate {
  $schema: string;
  contentVersion: string;
  parameters: {
    [key: string]: any;
  };
  resources: any[];
  variables?: any;
}

/**
 * Represents an Azure ARM deployment
 */
export interface ArmDeployment {
  template: ArmResourceTemplate;
  parameters: { [key: string]: any };
}
