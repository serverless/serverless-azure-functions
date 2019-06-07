import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { Utils, FunctionMetadata } from "./utils";

describe("utils", () => {
  let sls: Serverless;

  beforeEach(() => {
    const slsConfig = {
      service: "My test service",
      provider: "azure",
      functions: MockFactory.createTestSlsFunctionConfig(),
    };

    sls = MockFactory.createTestServerless();
    Object.assign(sls.service, slsConfig);
  });

  it("resolves handler when handler code is outside function folders", () => {
    sls.service["functions"].hello.handler = "src/handlers/hello.handler";

    const functions = sls.service.getAllFunctions();
    const metadata = Utils.getFunctionMetaData(functions[0], sls);

    const expectedMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: "..\\src\\handlers\\hello.js",
      params: expect.anything(),
    };

    expect(metadata).toEqual(expectedMetadata);
  });

  it("resolves handler when code is in function folder", () => {
    sls.service["functions"].hello.handler = "hello/index.handler";

    const functions = sls.service.getAllFunctions();
    const metadata = Utils.getFunctionMetaData(functions[0], sls);

    const expectedMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: "index.js",
      params: expect.anything(),
    };

    expect(metadata).toEqual(expectedMetadata);
  });

  it("resolves handler when code is at the project root", () => {
    sls.service["functions"].hello.handler = "hello.handler";

    const functions = sls.service.getAllFunctions();
    const metadata = Utils.getFunctionMetaData(functions[0], sls);

    const expectedMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: "..\\hello.js",
      params: expect.anything(),
    };

    expect(metadata).toEqual(expectedMetadata);
  });
});