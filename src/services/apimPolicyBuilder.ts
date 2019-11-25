import { ApiJwtValidatePolicy, ApiJwtClaim, ApiCorsPolicy, ApiIpFilterPolicy, ApiCheckHeaderPolicy } from "../models/apiManagement";
import { Guard } from "../shared/guard";
import { Builder, Parser } from "xml2js";

declare type PolicyType = "inbound" | "outbound" | "backend" | "on-error";

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

    const policy = {
      $: { action: ipConfig.action },
      addressRange: ipConfig.addressRange,
      address: ipConfig.addresses
    }

    Object.keys(policy).forEach((key) => {
      if (!policy[key]) {
        delete policy[key];
      }
    });

    this.updatePolicy(
      "inbound",
      "ip-filter",
      policy,
      (policy) => policy.$.action === ipConfig.action
    );

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

    const policy = {
      $: attributes,
      "openid-config": oidConfig,
      "issuer-signing-keys": signingKeys,
      "decryption-keys": decryptionKeys,
      "audiences": audiences,
      "issuers": issuers,
      "required-claims": claims
    };

    Object.keys(policy).forEach((key) => {
      if (!policy[key]) {
        delete policy[key];
      }
    });

    this.policyRoot.policies.inbound[0]["validate-jwt"] = [policy];

    return this;
  }

  public checkHeader(checkHeaderPolicy: ApiCheckHeaderPolicy): ApimPolicyBuilder {
    Guard.null(checkHeaderPolicy, "checkHeaderPolicy");

    const attributeMap = {
      headerName: "name",
      failedStatusCode: "failed-check-httpcode",
      failedErrorMessage: "failed-check-error-message",
      ignoreCase: "ignore-case"
    };

    const attributes = {};

    Object.keys(attributeMap).forEach((key) => {
      if (checkHeaderPolicy[key]) {
        attributes[attributeMap[key]] = checkHeaderPolicy[key];
      }
    });

    const policy = {
      $: attributes,
      value: checkHeaderPolicy.values
    };

    this.updatePolicy(
      "inbound",
      "check-header",
      policy,
      // We are keying the check-header policy by header name
      (policy) => policy.$.name === checkHeaderPolicy.headerName
    );

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
   * Updates the matching policy or appends a new policy
   * @param policyType The policy type (inbound | outbound | backend | on-error)
   * @param policyName The xml element name of the policy
   * @param newPolicy The new policy XML object
   * @param predicate The condition to check for existing policy
   */
  private updatePolicy(policyType: PolicyType, policyName: string, newPolicy: any, predicate: (policy: any) => boolean): void {
    const existing = this.policyRoot.policies[policyType][0][policyName];

    // Add new policy to empty list
    if (!existing) {
      this.policyRoot.policies[policyType][0][policyName] = [newPolicy];
      return;
    }

    // Find and replace the first matching policy
    for (let i = 0; i < existing.length; i++) {
      const policy = existing[i];
      if (predicate(policy)) {
        existing[i] = newPolicy;
        return;
      }
    }

    // Append new policy if not found
    existing.push(newPolicy);
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
