import { ApiContract, BackendContract } from "@azure/arm-apimanagement/esm/models";

/**
 * Defines the serverless APIM configuration
 */
export interface ApiManagementConfig {
  /** The name of the APIM azure resource */
  name: string;
  /** The API contract configuration */
  apis: ApiContract[];
  /** The API's backend contract configuration */
  backends?: BackendContract[];
  /** The API's CORS policy */
  cors?: ApiCorsPolicy;
  /** The API's JWT validation policy */
  jwt?: ApiJwtPolicy;
  sku?: {
    name?: string;
    capacity?: number;
  };
  publisherEmail?: string;
  publisherName?: string;
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

export interface ApiJwtPolicy {
  queryParamName?: string;
  headerName?: string;
  tokenValue?: string;
  scheme?: string;
  failedStatusCode?: number;
  failedErrorMessage?: string;
  requireExpirationTime?: boolean;
  requireSignedTokens?: boolean;
  clockSkew?: number;
  outputTokenVariableName?: string;
  openId?: {
    metadataUrl: string;
  };
  signingKeys?: string[];
  decryptionKeys?: string[];
  audiences?: string[];
  issuers?: string[];
  requiredClaims?: ApiJwtClaim[];
}

export interface ApiJwtClaim {
  name: string;
  match: string;
  separator?: string;
  values?: string[];
}
