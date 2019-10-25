import { ApiJwtPolicy, ApiJwtClaim, ApiCorsPolicy } from "../models/apiManagement";
import { Guard } from "../shared/guard";
import { Builder, Parser } from "xml2js";

export class ApimPolicyBuilder {
  private policyRoot: any = {};

  public constructor() {
    this.init();
  }

  public static async parse(xml: string): Promise<ApimPolicyBuilder> {
    const parser = new Parser();
    const builder = new ApimPolicyBuilder();
    builder.policyRoot = await parser.parseStringPromise(xml);

    return builder;
  }

  public build(): string {
    const builder = new Builder();
    return builder.buildObject(this.policyRoot);
  }

  public toObject(): any {
    return { ...this.policyRoot };
  }

  public setBackendService(backendId: string): ApimPolicyBuilder {
    Guard.empty(backendId);

    this.policyRoot.policies.inbound[0]["set-backend-service"] = [
      { $: { "id": "apim-generated-policy", "backend-id": backendId } }
    ];

    return this;
  }

  public cors(corsConfig: ApiCorsPolicy): ApimPolicyBuilder {
    Guard.null(corsConfig);

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

  public jwtValidate(jwtPolicy: ApiJwtPolicy): ApimPolicyBuilder {
    Guard.null(jwtPolicy);

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

  private createClaimElement(claim: ApiJwtClaim) {
    return {
      claim: {
        $: { name: claim.name, match: claim.match, separator: claim.separator },
        value: claim.values
      }
    };
  }
}
