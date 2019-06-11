import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { BindingUtils } from "./bindings";
import mockFs from "mock-fs";

describe("Bindings", () => {
  let sls: Serverless;

  afterEach(() => {
    mockFs.restore();
  });

  beforeEach(() => {
    sls = MockFactory.createTestServerless();
    sls.config.servicePath = process.cwd();
  });

  it("should get bindings metadata from serverless", () => {
    expect(sls).not.toBeNull();
    BindingUtils.getBindingsMetaData(sls);
    expect(sls.cli.log).toBeCalledWith("Parsing Azure Functions Bindings.json...");
  });
});
