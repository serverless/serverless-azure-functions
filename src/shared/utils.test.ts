import path from "path";
import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { FunctionMetadata, Utils } from "./utils";

describe("utils", () => {
  let sls: Serverless;

  beforeEach(() => {
    const slsConfig = {
      service: "my test service",
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

  it("should create string from substrings", () => {
    expect(
      Utils.appendSubstrings(
        2,
        "abcde",
        "fghij",
        "klmno",
        "pqrst",
        "uvwxyz",
        "ab",
      )
    ).toEqual("abfgklpquvab");
  });

  it("should get a timestamp from a name", () => {
    expect(Utils.getTimestampFromName("myDeployment-t12345")).toEqual("12345");
    expect(Utils.getTimestampFromName("myDeployment-t678987645")).toEqual("678987645");
    expect(Utils.getTimestampFromName("-t12345")).toEqual("12345");

    expect(Utils.getTimestampFromName("myDeployment-t")).toEqual(null);
    expect(Utils.getTimestampFromName("")).toEqual(null);
  });

  it("should get incoming binding", () => {
    expect(Utils.getIncomingBindingConfig(MockFactory.createTestAzureFunctionConfig())).toEqual(
      {
        http: true,
        "x-azure-settings": MockFactory.createTestHttpBinding("in"),
      }
    );
  });

  it("should get outgoing binding", () => {
    expect(Utils.getOutgoingBinding(MockFactory.createTestAzureFunctionConfig())).toEqual(
      {
        http: true,
        "x-azure-settings": MockFactory.createTestHttpBinding("out"),
      }
    );
  });
});
