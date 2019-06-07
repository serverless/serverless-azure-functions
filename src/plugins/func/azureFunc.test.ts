import fs from "fs";
import mockFs from "mock-fs";
import path from "path";
import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureFuncPlugin } from "./azureFunc";
import rimraf from "rimraf";

describe("Azure Func Plugin", () => {

  it("displays a help message", async () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();

    const plugin = new AzureFuncPlugin(sls, options);
    await invokeHook(plugin, "func:func");

    expect(sls.cli.log).toBeCalledWith("Use the func plugin to add or remove functions within Function App");
  })

  describe("Add command", () => {

    beforeAll(() => {
      mockFs({
        "myExistingFunction": {
          "index.js": "contents",
          "function.json": "contents",
        },
        "serverless.yml": MockFactory.createTestServerlessYml(true),
      }, { createCwd: true, createTmp: true })
    });

    afterAll(() => {
      mockFs.restore();
    });

    it("returns with missing name", async () => {
      const sls = MockFactory.createTestServerless();
      const options = MockFactory.createTestServerlessOptions();

      const plugin = new AzureFuncPlugin(sls, options);
      await invokeHook(plugin, "func:add:add");

      expect(sls.cli.log).toBeCalledWith("Need to provide a name of function to add")
    });

    it("returns with pre-existing function", async () => {
      const sls = MockFactory.createTestServerless();
      const options = MockFactory.createTestServerlessOptions();
      options["name"] = "myExistingFunction";

      const plugin = new AzureFuncPlugin(sls, options);
      await invokeHook(plugin, "func:add:add");

      expect(sls.cli.log).toBeCalledWith("Function myExistingFunction already exists");
    });

    it("creates function directory and updates serverless.yml", async () => {
      const sls = MockFactory.createTestServerless();
      const options = MockFactory.createTestServerlessOptions();
      const functionName = "myFunction";
      options["name"] = functionName;
      const expectedFunctionsYml = MockFactory.createTestFunctionsMetadata();
      expectedFunctionsYml[functionName] = MockFactory.createTestFunctionMetadata(functionName);

      const plugin = new AzureFuncPlugin(sls, options);
      const mkdirSpy = jest.spyOn(fs, "mkdirSync");

      await invokeHook(plugin, "func:add:add");

      expect(mkdirSpy).toBeCalledWith(functionName);

      const writeFileCalls = (sls.utils.writeFileSync as any).mock.calls;
      expect(writeFileCalls[0][0]).toBe(path.join(functionName, "index.js"));
      expect(writeFileCalls[1][0]).toBe(path.join(functionName, "function.json"));

      expect(writeFileCalls[2][0]).toBe("serverless.yml");
      expect(writeFileCalls[2][1]).toBe(MockFactory.createTestServerlessYml(true, expectedFunctionsYml));
    });
  });

  describe("Remove command", () => {

    beforeAll(() => {
      mockFs({
        "function1": {
          "index.js": "contents",
          "function.json": "contents",
        },
      }, { createCwd: true, createTmp: true });
    });

    afterAll(() => {
      mockFs.restore();
    });

    it("returns with missing name", async () => {
      const sls = MockFactory.createTestServerless();
      const options = MockFactory.createTestServerlessOptions();
      const plugin = new AzureFuncPlugin(sls, options);
      await invokeHook(plugin, "func:remove:remove");
      expect(sls.cli.log).toBeCalledWith("Need to provide a name of function to remove")
    });

    it("returns with non-existing function", async () => {
      const sls = MockFactory.createTestServerless();
      const options = MockFactory.createTestServerlessOptions();
      options["name"] = "myNonExistingFunction";
      const plugin = new AzureFuncPlugin(sls, options);
      await invokeHook(plugin, "func:remove:remove");
      expect(sls.cli.log).toBeCalledWith("Function myNonExistingFunction does not exist");
    });

    it("deletes directory and updates serverless.yml", async () => {
      const sls = MockFactory.createTestServerless();
      const options = MockFactory.createTestServerlessOptions();
      const plugin = new AzureFuncPlugin(sls, options);
      const functionName = "function1";
      options["name"] = functionName;
      const rimrafSpy = jest.spyOn(rimraf, "sync");
      await invokeHook(plugin, "func:remove:remove");
      expect(rimrafSpy).toBeCalledWith(functionName);
      const expectedFunctionsYml = MockFactory.createTestFunctionsMetadata();
      delete expectedFunctionsYml[functionName];
      expect(sls.utils.writeFileSync).toBeCalledWith("serverless.yml", MockFactory.createTestServerlessYml(true, expectedFunctionsYml))
    });
  });
});