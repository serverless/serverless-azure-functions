import fs from "fs";
import mockFs from "mock-fs";
import rimraf from "rimraf";
import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureFuncPlugin } from "./azureFunc";

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
        "serverless.yml": MockFactory.createTestServerlessYml(true) as any,
      });
    });

    afterAll(() => {
      mockFs.restore();
    });

    afterEach(() => {
      jest.clearAllMocks();
    })

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
      options["name"] = "hello";

      const plugin = new AzureFuncPlugin(sls, options);
      await invokeHook(plugin, "func:add:add");

      expect(sls.cli.log).toBeCalledWith("Function hello already exists");
    });

    it("creates function handler and updates serverless.yml", async () => {
      const sls = MockFactory.createTestServerless();
      const options = MockFactory.createTestServerlessOptions();
      const functionName = "myFunction";
      options["name"] = functionName;
      const expectedFunctionsYml = MockFactory.createTestSlsFunctionConfig();
      expectedFunctionsYml[functionName] = MockFactory.createTestFunctionMetadata(functionName);

      const plugin = new AzureFuncPlugin(sls, options);

      await invokeHook(plugin, "func:add:add");

      const writeFileCalls = (sls.utils.writeFileSync as any).mock.calls;
      expect(writeFileCalls[0][0]).toBe(`./${functionName}.js`);

      expect(writeFileCalls[1][0]).toBe("serverless.yml");
      expect(writeFileCalls[1][1]).toBe(MockFactory.createTestServerlessYml(true, expectedFunctionsYml));
    });
  });

  describe("Remove command", () => {

    beforeAll(() => {
      mockFs({
        "index.js": "contents",
        "function1": {
          "function.json": "contents",
        },
      });
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
      mockFs({
        "hello.js": "contents",
        hello: {
          "function.json": "contents",
        }
      })
      const sls = MockFactory.createTestServerless();
      const options = MockFactory.createTestServerlessOptions();
      const plugin = new AzureFuncPlugin(sls, options);
      const functionName = "hello";
      options["name"] = functionName;
      const unlinkSpy = jest.spyOn(fs, "unlinkSync");
      const rimrafSpy = jest.spyOn(rimraf, "sync");
      await invokeHook(plugin, "func:remove:remove");
      expect(unlinkSpy).toBeCalledWith(`${functionName}.js`)
      expect(rimrafSpy).toBeCalledWith(functionName);
      const expectedFunctionsYml = MockFactory.createTestSlsFunctionConfig();
      delete expectedFunctionsYml[functionName];
      expect(sls.utils.writeFileSync).toBeCalledWith("serverless.yml", MockFactory.createTestServerlessYml(true, expectedFunctionsYml))
    });
  });
});