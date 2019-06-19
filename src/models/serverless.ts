import { ApiManagementConfig } from "./apiManagement";

export enum DeploymentType {
  Consumption,
  Premium,
}

export interface ArmTemplateConfig {
  type: string;
  file: string;
  parameters:
  {
    [key: string]: string;
  };
}

export interface ServerlessAzureConfig {
  provider: {
    name: string;
    region: string;
    apim?: ApiManagementConfig;
    armTemplate?: ArmTemplateConfig;
  };
  plugins: string[];
  functions: any;
}
