import { OperationContract, ApiContract, BackendContract } from "@azure/arm-apimanagement/esm/models";

export interface ApiManagementConfig {
  name: string;
  api: ApiContract;
  backend?: BackendContract;
  cors?: ApiCorsPolicy;
}

export interface ApiOperationOptions {
  function: string;
  operation: OperationContract;
}

export interface ApiCorsPolicy {
  allowCredentials: boolean;
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposeHeaders: string[];
}