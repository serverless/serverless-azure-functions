import { MockFactory } from "../test/mockFactory";
import { ApimPolicyBuilder } from "./apimPolicyBuilder";
import fs from "fs";
import { ApiIpFilterPolicy, ApiCheckHeaderPolicy } from "../models/apiManagement";

declare global {
  interface String {
    cleanXml(): string;
  }
}

// Only used in this spec for testing - otherwise move it out into some mixin / utility.
String.prototype.cleanXml = function () {
  return this
    .replace(/\s*</g, "<") // Replace any leading tag spaces
    .replace(/>\s*/g, ">") // Replace and trailing tag spaces
    .replace(/(?:\r\n|\r|\n|\t)/g, ""); // Remove any line-breaks & tabs
};

describe("APIM PolicyBuilder", () => {
  it("can create jwt validation policy", () => {
    const expected = fs.readFileSync(`${process.cwd()}/src/test/policies/jwt-validate.xml`)
      .toString()
      .cleanXml();

    const jwtPolicy = MockFactory.createTestMockApiJwtPolicy();
    jwtPolicy.openId = {
      metadataUrl: "https://someurl"
    };
    jwtPolicy.requiredClaims = [
      {
        name: "aud",
        match: "all",
        separator: ":",
        values: ["value1", "value2", "value3"]
      },
      {
        name: "sub",
        match: "any",
        separator: ":",
        values: ["value4", "value5", "value6"]
      }
    ];


    const policyBuilder = new ApimPolicyBuilder();
    const actual = policyBuilder
      .jwtValidate(jwtPolicy)
      .build()
      .cleanXml();

    expect(actual).toEqual(expected);
  });

  it("can create cors policy", () => {
    const expected = fs.readFileSync(`${process.cwd()}/src/test/policies/cors.xml`)
      .toString()
      .cleanXml();

    const corsPolicy = MockFactory.createTestMockApiCorsPolicy();

    const policyBuilder = new ApimPolicyBuilder();
    const actual = policyBuilder
      .cors(corsPolicy)
      .build()
      .cleanXml();

    expect(actual).toEqual(expected);
  });

  it("can create a combined policy that includes cors and jwt validation", () => {
    const expected = fs.readFileSync(`${process.cwd()}/src/test/policies/combined.xml`)
      .toString()
      .cleanXml();

    const corsPolicy = MockFactory.createTestMockApiCorsPolicy();
    const jwtPolicy = MockFactory.createTestMockApiJwtPolicy();

    const policyBuilder = new ApimPolicyBuilder();
    const actual = policyBuilder
      .cors(corsPolicy)
      .jwtValidate(jwtPolicy)
      .build()
      .cleanXml();

    expect(actual).toEqual(expected);
  });

  it("can create backend operation policy", () => {
    const expected = fs.readFileSync(`${process.cwd()}/src/test/policies/backend-service.xml`)
      .toString()
      .cleanXml();

    const policyBuilder = new ApimPolicyBuilder();
    const actual = policyBuilder
      .setBackendService("my-custom-service")
      .build()
      .cleanXml();

    expect(actual).toEqual(expected);
  });

  it("can create an IP filter API policy", () => {
    const expected = fs.readFileSync(`${process.cwd()}/src/test/policies/ip-filter.xml`)
      .toString()
      .trim()
      .cleanXml();

    const ipPolicy: ApiIpFilterPolicy = {
      action: "allow",
      addressRange: {
        from: "1.1.1.1",
        to: "1.1.1.255"
      },
      addresses: [
        "2.2.2.2",
        "3.3.3.3"
      ]
    };

    const policyBuilder = new ApimPolicyBuilder();
    const actual = policyBuilder
      .ipFilter(ipPolicy)
      .build()
      .cleanXml();

    expect(actual).toEqual(expected);
  });

  it("can create a check header policy", () => {
    const expected = fs.readFileSync(`${process.cwd()}/src/test/policies/check-header.xml`)
      .toString()
      .trim()
      .cleanXml();

    const checkHeaderPolicy: ApiCheckHeaderPolicy = {
      headerName: "authorization",
      failedStatusCode: 401,
      failedErrorMessage: "The authorization header is either missing or invalid",
      values: ["value1", "value2", "value3"],
      ignoreCase: true
    };

    const policyBuilder = new ApimPolicyBuilder();
    const actual = policyBuilder
      .checkHeader(checkHeaderPolicy)
      .build()
      .cleanXml();

    expect(actual).toEqual(expected);
  });

  it("can append a new check header policy", async () => {
    const expected = fs.readFileSync(`${process.cwd()}/src/test/policies/append-check-header.xml`)
      .toString()
      .trim()
      .cleanXml();

    const policyXml = fs.readFileSync(`${process.cwd()}/src/test/policies/check-header.xml`).toString();
    const policyBuilder = await ApimPolicyBuilder.parse(policyXml);

    const anotherPolicy: ApiCheckHeaderPolicy = {
      headerName: "foo",
      values: ["bar"],
      failedStatusCode: 400,
      failedErrorMessage: "Bad Request",
      ignoreCase: true
    };

    const actual = policyBuilder
      .checkHeader(anotherPolicy)
      .build()
      .cleanXml();

    expect(actual).toEqual(expected);
  });
});
