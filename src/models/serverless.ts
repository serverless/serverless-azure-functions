import { ApiManagementConfig } from "./apiManagement";
import Serverless from "serverless";

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

export interface DeploymentConfig {
  rollback?: boolean;
  container?: string;
}

export interface ServerlessAzureProvider {
  type?: string;
  prefix?: string;
  region: string;
  stage: string;
  name: string;
  environment?: {
    [key: string]: any;
  };
  deploymentName?: string;
  resourceGroup?: string;
  apim?: ApiManagementConfig;
  functionApp?: FunctionAppConfig;
  appInsights?: ResourceConfig;
  appServicePlan?: ResourceConfig;
  storageAccount?: ResourceConfig;
  hostingEnvironment?: ResourceConfig;
  virtualNetwork?: ResourceConfig;
  armTemplate?: ArmTemplateConfig;
}

export interface ServerlessAzureConfig {
  service: string;
  provider: ServerlessAzureProvider;
  plugins: string[];
  functions: any;
}

export interface ServerlessAzureOptions extends Serverless.Options {
  resourceGroup?: string;
}
