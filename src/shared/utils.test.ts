import Serverless from "serverless";
import path, { relative } from "path";
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
    MockFactory.updateService(sls);

    const functions = sls.service.getAllFunctions();
    const metadata = Utils.getFunctionMetaData(functions[0], sls);

    const expectedMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: path.normalize("../src/handlers/hello.js"),
      params: expect.anything(),
    };

    expect(metadata).toEqual(expectedMetadata);
  });

  it("resolves handler when code is in function folder", () => {
    sls.service["functions"].hello.handler = "hello/index.handler";
    MockFactory.updateService(sls);

    const functions = sls.service.getAllFunctions();
    const metadata = Utils.getFunctionMetaData(functions[0], sls);

    const expectedMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: path.normalize("index.js"),
      params: expect.anything(),
    };

    expect(metadata).toEqual(expectedMetadata);
  });

  it("resolves handler when code is at the project root", () => {
    sls.service["functions"].hello.handler = "hello.handler";
    MockFactory.updateService(sls);

    const functions = sls.service.getAllFunctions();
    const metadata = Utils.getFunctionMetaData(functions[0], sls);

    const expectedMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: path.normalize("../hello.js"),
      params: expect.anything(),
    };

    expect(metadata).toEqual(expectedMetadata);
  });
});