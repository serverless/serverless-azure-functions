import { ApiManagementConfig } from "./apiManagement";

export enum DeploymentType {
  Consumption,
  Premium,
}

export interface ArmTemplateConfig {
  file: string;
  parameters:
  {
    [key: string]: string;
  };
}

export interface ResourceConfig {
  name: string;
  sku?: {
    name?: string;
    tier?: string;
  };
  [key: string]: any;
}

export interface ServerlessAzureConfig {
  service: string;
  provider: {
    type?: string;
    prefix?: string;
    region: string;
    stage: string;
    name: string;
    environment?: {
      [key: string]: any;
    };
    resourceGroup?: string;
    apim?: ApiManagementConfig;
    functionApp?: ResourceConfig;
    appInsightsConfig?: ResourceConfig;
    appServicePlan?: ResourceConfig;
    storageAccount?: ResourceConfig;
    hostingEnvironment?: ResourceConfig;
    virtualNetwork?: ResourceConfig;
    armTemplate?: ArmTemplateConfig;
  };
  plugins: string[];
  functions: any;
}
