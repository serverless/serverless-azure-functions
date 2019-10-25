import { MockFactory } from "../test/mockFactory";
import { ApimPolicyBuilder } from "./apimPolicyBuilder";
import fs from "fs";

describe("APIM PolicyBuilder", () => {
  it("can create jwt validation policy", () => {
    const expected = fs.readFileSync(`${process.cwd()}/src/test/policies/jwt.xml`).toString().trim();
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
      .build();

    expect(actual).toEqual(expected);
  });

  it("can create cors policy", () => {
    const expected = fs.readFileSync(`${process.cwd()}/src/test/policies/cors.xml`).toString().trim();
    const corsPolicy = MockFactory.createTestMockApiCorsPolicy();

    const policyBuilder = new ApimPolicyBuilder();
    const actual = policyBuilder
      .cors(corsPolicy)
      .build();

    expect(actual).toEqual(expected);
  });

  it("can create a combined policy that includes cors and jwt validation", () => {
    const expected = fs.readFileSync(`${process.cwd()}/src/test/policies/combined.xml`).toString().trim();
    const corsPolicy = MockFactory.createTestMockApiCorsPolicy();
    const jwtPolicy = MockFactory.createTestMockApiJwtPolicy();

    const policyBuilder = new ApimPolicyBuilder();
    const actual = policyBuilder
      .cors(corsPolicy)
      .jwtValidate(jwtPolicy)
      .build();

    expect(actual).toEqual(expected);
  });

  it("can create backend operation policy", () => {
    const expected = fs.readFileSync(`${process.cwd()}/src/test/policies/backend-service.xml`).toString().trim();

    const policyBuilder = new ApimPolicyBuilder();
    const actual = policyBuilder
      .setBackendService("my-custom-service")
      .build();

    expect(actual).toEqual(expected);
  });
});
