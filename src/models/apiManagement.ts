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
  jwtValidate?: ApiJwtValidatePolicy;
  /** The API's IP Filter policy */
  ipFilter?: ApiIpFilterPolicy;
  /** The API's IP Filter policies */
  ipFilters?: ApiIpFilterPolicy[];
  /** The API's header policies */
  checkHeaders?: ApiCheckHeaderPolicy[];
  /** The pricing SKU for the APIM instance */
  sku?: {
    /** The SKU name, (consumption | developer | basic | standard | premium) */
    name?: string;
    /** The max number of reserved nodes for the specified SKU */
    capacity?: number;
  };
  /** The publisher e-mail associated with the APIM instance */
  publisherEmail?: string;
  /** The publisher name associated with the APIM instance */
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

/**
 * Defines an APIM JWT validation policy
 * See https://docs.microsoft.com/en-us/azure/api-management/api-management-access-restriction-policies#ValidateJWT for more information
 */
export interface ApiJwtValidatePolicy {
  /** The name of the query string parameter that contains the JWT token */
  queryParamName?: string;
  /** The name of the HTTP header that contains the JWT token */
  headerName?: string;
  /** An explicit JWT token value to validate */
  tokenValue?: string;
  /** The authorization scheme to acceept (ex. bearer) */
  scheme?: string;
  /** The HTTP status code to return for a failed response */
  failedStatusCode?: number;
  /** The error message to return for a failed response */
  failedErrorMessage?: string;
  /** Whether or not an expiration claim is required in the token */
  requireExpirationTime?: boolean;
  /** Whether or not tokens must be signed */
  requireSignedTokens?: boolean;
  /** Number of seconds to skew the clock */
  clockSkew?: number;
  /** String. Name of context variable that will receive token value as an object of type Jwt upon successful token validation */
  outputTokenVariableName?: string;
  /** Specifies the OpenID configuration used to validate the JWT token */
  openId?: {
    /** Link to the OpenID metadata url */
    metadataUrl: string;
  };
  /** List of valid Base64 encoded signing keys */
  signingKeys?: string[];
  /** List of valie Base64 encoded decryption keys */
  decryptionKeys?: string[];
  /** List of valid audiences for the token */
  audiences?: string[];
  /** List of valid issuers for the token */
  issuers?: string[];
  /** List of claims that must exist within the token */
  requiredClaims?: ApiJwtClaim[];
}

/**
 * A JWT validation claim
 */
export interface ApiJwtClaim {
  /** The name of the claim to validate */
  name: string;
  /** Whether the claim value must contain all or any value */
  match: "all" | "any";
  /** The seperator used to parse multi-valued claims */
  separator?: string;
  /** The values to match against */
  values?: string[];
}

/**
 * An IP Filter validation policy
 */
export interface ApiIpFilterPolicy {
  /** Whether the policy should allow or forbid the address specification */
  action: "allow" | "forbid";
  addresses?: string[];
  /** The range of IP addresses to apply to the policy */
  addressRange?: {
    from: string;
    to: string;
  };
}

/**
 * A header validation policy
 */
export interface ApiCheckHeaderPolicy {
  /** The name of the HTTP header that to validate */
  headerName: string;
  /** The HTTP status code to return for a failed response */
  failedStatusCode?: number;
  /** The error message to return for a failed response */
  failedErrorMessage?: string;
  /** Performs a case insensitive comparison to the allowed values */
  ignoreCase?: boolean;
  /** List of allowed values to compare against */
  values: string[];
}
