import { MockFactory } from "../test/mockFactory";
import { Utils, FunctionMetadata } from "./utils";

describe("utils", () => {
  it("get the function metadata for the specified function name", () => {
    const slsConfig = {
      service: "My test service",
      provider: "azure",
      functions: MockFactory.createTestSlsFunctionConfig(),
    };

    const sls = MockFactory.createTestServerless();
    Object.assign(sls.service, slsConfig);

    const functions = sls.service.getAllFunctions();
    const metadata = Utils.getFunctionMetaData(functions[0], sls);

    const expectedMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: "..\\src\\handlers\\hello.js",
      params: expect.anything(),
    };

    expect(metadata).toEqual(expectedMetadata);
  });
});