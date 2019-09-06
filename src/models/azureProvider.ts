export interface FunctionEvent {
  http?: boolean;
  "x-azure-settings"?: {
    authLevel?: string;
    direction?: string;
    name?: string;
  };
}

export interface ServicePrincipalEnvVariables {
  AZURE_SUBSCRIPTION_ID: string;
  AZURE_CLIENT_ID: string;
  AZURE_CLIENT_SECRET: string;
  AZURE_TENANT_ID: string;
}

export interface FunctionMetadata {
  handler: string;
  events: FunctionEvent[];
}

export interface DeploymentExtendedError {
  code: string;
  message: string;
  details?: DeploymentExtendedError[];
}
