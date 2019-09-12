import { ServerlessAzureFunctionBindingConfig } from "./serverless";

export interface ServicePrincipalEnvVariables {
  AZURE_SUBSCRIPTION_ID: string;
  AZURE_CLIENT_ID: string;
  AZURE_CLIENT_SECRET: string;
  AZURE_TENANT_ID: string;
}

export interface FunctionMetadata {
  handler: string;
  events: ServerlessAzureFunctionBindingConfig[];
}

export interface DeploymentExtendedError {
  code: string;
  message: string;
  details?: DeploymentExtendedError[];
}
