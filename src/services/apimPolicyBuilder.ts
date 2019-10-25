import { ApiJwtValidatePolicy, ApiJwtClaim, ApiCorsPolicy, ApiIpFilterPolicy } from "../models/apiManagement";
import { Guard } from "../shared/guard";
import { Builder, Parser } from "xml2js";

/**
 * APIM Policy build that can be used to build polices for APIs, Backends & operations
 */
export class ApimPolicyBuilder {
  private policyRoot: any = {};

  public constructor() {
    this.init();
  }

  /**
   * Parses an APIM xml policy and loads it into a Policy Bulder
   * @param xml The xml policy
   */
  public static async parse(xml: string): Promise<ApimPolicyBuilder> {
    Guard.empty(xml, "xml");

    const parser = new Parser();
    const builder = new ApimPolicyBuilder();
    builder.policyRoot = await parser.parseStringPromise(xml);

    return builder;
  }

  /**
   * Generates the XML policy that is compatible with APIM
   */
  public build(): string {
    const builder = new Builder();
    return builder.buildObject(this.policyRoot);
  }

  /**
   * Adds a policy to specify the APIM backend to use for an operation
   * @param backendId The APIM backend id
   */
  public setBackendService(backendId: string): ApimPolicyBuilder {
    Guard.empty(backendId, "backendId");

    this.policyRoot.policies.inbound[0]["set-backend-service"] = [
      { $: { "id": "apim-generated-policy", "backend-id": backendId } }
    ];

    return this;
  }

  /**
   * Applies the CORS policy to an APIM API
   * @param corsConfig The APIM CORS configuration
   */
  public cors(corsConfig: ApiCorsPolicy): ApimPolicyBuilder {
    Guard.null(corsConfig, "corsConfig");

    const origins = corsConfig.allowedOrigins ? [corsConfig.allowedOrigins.map((origin) => ({ origin }))] : null;
    const methods = corsConfig.allowedMethods ? [corsConfig.allowedMethods.map((method) => ({ method }))] : null;
    const allowedHeaders = corsConfig.allowedHeaders ? [corsConfig.allowedHeaders.map((header) => ({ header }))] : null;
    const exposeHeaders = corsConfig.exposeHeaders ? [corsConfig.exposeHeaders.map((header) => ({ header }))] : null;

    this.policyRoot.policies.inbound[0].cors = [
      {
        $: { "allow-credentials": !!corsConfig.allowCredentials },
        "allowed-origins": origins,
        "allowed-methods": methods,
        "allowed-headers": allowedHeaders,
        "expose-headers": exposeHeaders
      }
    ];

    return this;
  }

  /**
   * Applies an IP filter configuration policy to an APIM API
   * @param ipConfig The IP configuration policy
   */
  public ipFilter(ipConfig: ApiIpFilterPolicy): ApimPolicyBuilder {
    Guard.null(ipConfig, "ipConfig");

    const element = {
      $: { action: ipConfig.action },
      addressRange: ipConfig.addressRange,
      address: ipConfig.addresses
    }

    Object.keys(element).forEach((key) => {
      if (!element[key]) {
        delete element[key];
      }
    });

    this.policyRoot.policies.inbound[0]["ip-filter"] = [element];

    return this;
  }

  /**
   * Applies the JWT validation policy to an APIM API
   * @param jwtPolicy The JWT validation configuration
   */
  public jwtValidate(jwtPolicy: ApiJwtValidatePolicy): ApimPolicyBuilder {
    Guard.null(jwtPolicy, "jwtPolicy");

    const signingKeys = jwtPolicy.signingKeys ? [jwtPolicy.signingKeys.map((key) => ({ key }))] : null;
    const decryptionKeys = jwtPolicy.decryptionKeys ? [jwtPolicy.decryptionKeys.map((key) => ({ key }))] : null;
    const audiences = jwtPolicy.audiences ? [jwtPolicy.audiences.map((audience) => ({ audience }))] : null;
    const issuers = jwtPolicy.issuers ? [jwtPolicy.issuers.map((issuer) => ({ issuer }))] : null;
    const oidConfig = jwtPolicy.openId && jwtPolicy.openId.metadataUrl ? [{ $: { url: jwtPolicy.openId.metadataUrl } }] : null;
    const claims = jwtPolicy.requiredClaims ? [jwtPolicy.requiredClaims.map(this.createClaimElement)] : null;

    const attributeMap = {
      headerName: "header-name",
      tokenValue: "token-value",
      queryParamName: "query-parameter-name",
      failedStatusCode: "failed-validation-httpcode",
      failedErrorMessage: "failed-validation-error-message",
      requireExpirationTime: "require-expiration-time",
      scheme: "require-scheme",
      requireSignedTokens: "require-signed-tokens",
      clockSkew: "clock-skew",
      outputTokenVariableName: "output-token-variable-name"
    };

    const attributes = {};

    Object.keys(attributeMap).forEach((key) => {
      if (jwtPolicy[key]) {
        attributes[attributeMap[key]] = jwtPolicy[key];
      }
    });

    const elements = {
      $: attributes,
      "openid-config": oidConfig,
      "issuer-signing-keys": signingKeys,
      "decryption-keys": decryptionKeys,
      "audiences": audiences,
      "issuers": issuers,
      "required-claims": claims
    };

    Object.keys(elements).forEach((key) => {
      if (!elements[key]) {
        delete elements[key];
      }
    });

    this.policyRoot.policies.inbound[0]["validate-jwt"] = [elements];

    return this;
  }

  /**
   * Initializes an empty APIM policy
   */
  private init(): void {
    this.policyRoot = {
      policies:
      {
        "inbound": [{ base: null }],
        "backend": [{ base: null }],
        "outbound": [{ base: null }],
        "on-error": [{ base: null }]
      }
    }
  }

  /**
   * Create a claim element for a JWT validation policy
   * @param claim The JWT claim
   */
  private createClaimElement(claim: ApiJwtClaim) {
    return {
      claim: {
        $: { name: claim.name, match: claim.match, separator: claim.separator },
        value: claim.values
      }
    };
  }
}
