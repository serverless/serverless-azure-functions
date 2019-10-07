import { ServerlessAzureConfig } from "./serverless";

/**
 * ARM Resource Template Generator
 */
export interface ArmResourceTemplateGenerator {
  getTemplate(): ArmResourceTemplate;
  getParameters(config: ServerlessAzureConfig): ArmParameters;
}

export enum ArmTemplateProvisioningState {
  FAILED = "Failed",
  SUCCEEDED = "Succeeded",
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
 * Parameter types within an ARM template
 */
export enum ArmParamType {
  String = "String",
  Int = "Int",
  SystemAssigned = "SystemAssigned",
  Bool = "Bool",
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

export interface ArmParameters {
  [key: string]: ArmParameter;
}

export interface ArmParameter {
  type?: ArmParamType;
  value?: string | number | boolean;
  defaultValue?: string | number | boolean;
}

export interface DefaultArmParams {
  location?: ArmParameter;
}

/**
 * Represents an Azure ARM deployment
 */
export interface ArmDeployment {
  template: ArmResourceTemplate;
  parameters: ArmParameters;
}
