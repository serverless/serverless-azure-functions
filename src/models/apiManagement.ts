import { OperationContract, ApiContract, BackendContract } from "@azure/arm-apimanagement/esm/models";

/**
 * Defines the serverless APIM configuration
 */
export interface ApiManagementConfig {
  /** The name of the APIM azure resource */
  name: string;
  /** The API contract configuration */
  api: ApiContract;
  /** The API's backend contract configuration */
  backend?: BackendContract;
  /** The API's CORS policy */
  cors?: ApiCorsPolicy;
}

/**
 * Defines the APIM API Operation configuration
 */
export interface ApiOperationOptions {
  /** The name of the serverless function */
  function: string;
  /** The APIM operation contract configuration */
  operation: OperationContract;
}

/**
 * Defines an APIM API CORS (cross origin resource sharing) policy
 */
export interface ApiCorsPolicy {
  /** Whether or not to allow credentials */
  allowCredentials: boolean;
  /** A list of allowed domains - also supports wildcard "*" */
  allowedOrigins: string[];
  /** A list of allowed HTTP methods */
  allowedMethods: string[];
  /** A list of allowed headers */
  allowedHeaders: string[];
  /** A list of headers exposed during OPTION preflight requests */
  exposeHeaders: string[];
}