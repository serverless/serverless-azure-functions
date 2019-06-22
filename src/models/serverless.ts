import { ApiManagementConfig } from "./apiManagement";

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

export interface FunctionAppConfig extends ResourceConfig {
  nodeVersion?: string;
  workerRuntime?: string;
  extensionVersion?;
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
    functionApp?: FunctionAppConfig;
    appInsights?: ResourceConfig;
    appServicePlan?: ResourceConfig;
    storageAccount?: ResourceConfig;
    hostingEnvironment?: ResourceConfig;
    virtualNetwork?: ResourceConfig;
    armTemplate?: ArmTemplateConfig;
  };
  plugins: string[];
  functions: any;
}
