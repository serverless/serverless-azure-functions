import { ServerlessAzureConfig } from "./serverless";

/**
 * ARM Resource Template Generator
 */
export interface ArmResourceTemplateGenerator {
  getTemplate(): ArmResourceTemplate;
  getParameters(config: ServerlessAzureConfig): any;
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
