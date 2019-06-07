import { MockFactory } from "../test/mockFactory";
import { BindingUtils } from "./bindings";
import { FunctionMetadata } from "./utils";
import path from "path";
import fs from "fs";
import mockFs from "mock-fs";

describe("Bindings", () => {
  afterAll(() => {
    mockFs.restore();
  })

  it("should get bindings metadata from serverless", () => {
    const sls = MockFactory.createTestServerless();
    expect(sls).not.toBeNull();
    BindingUtils.getBindingsMetaData(sls);
    expect(sls.cli.log).toBeCalledWith("Parsing Azure Functions Bindings.json...");
  });

  it("createEventsBindings writes function.json files into function folder", async () => {
    const sls = MockFactory.createTestServerless();
    sls.config.servicePath = process.cwd();

    const functionName = "helloWorld";
    const functionMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: "src/handlers/hello.js",
      params: {
        functionsJson: {},
      },
    };

    const expectedFolderPath = path.join(sls.config.servicePath, functionName);
    const expectedFilePath = path.join(expectedFolderPath, "function.json");

    mockFs({}, { createCwd: true });

    const mkdirSpy = jest.spyOn(fs, "mkdirSync");
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");

    await BindingUtils.createEventsBindings(sls.config.servicePath, functionName, functionMetadata);

    expect(mkdirSpy).toBeCalledWith(expectedFolderPath);
    expect(writeFileSpy).toBeCalledWith(expectedFilePath, expect.any(String));
  });
});