export interface FunctionEvent {
  http?: boolean;
  "x-azure-settings"?: {
    authLevel?: string;
    direction?: string;
    name?: string;
  };
}

export interface ServicePrincipalEnvVariables {
  azureSubId: string;
  azureServicePrincipalClientId: string;
  azureServicePrincipalPassword: string;
  azureServicePrincipalTenantId: string;
}

export interface FunctionMetadata {
  handler: string;
  events: FunctionEvent[];
}
