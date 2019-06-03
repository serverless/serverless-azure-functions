export interface ServerlessYml {
  provider: {
    name: string;
    location: string;
  };
  plugins: string[];
  functions: any;
}

export interface FunctionMetadata {
  handler: string;
  events: FunctionEvent[];
}

export interface FunctionEvent {
  http?: boolean;
  "x-azure-settings"?: {
    authLevel?: string;
    direction?: string;
    name?: string;
  };
}

export interface FunctionApp {
  id: string;
  name: string;
  defaultHostName: string;
}

export interface AzureServiceProvider {
  resourceGroup: string;
  deploymentName: string;
}

export interface Logger {
  log: (message: string) => void;
}

export interface ServicePrincipalEnvVariables {
  azureSubId: string;
  azureServicePrincipalClientId: string;
  azureServicePrincipalPassword: string;
  azureServicePrincipalTenantId: string;
}

