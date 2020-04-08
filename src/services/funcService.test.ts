import fs from "fs";
import mockFs from "mock-fs";
import rimraf from "rimraf";
import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { FuncService } from "./funcService";

describe("Azure Func Service", () => {

  function createService(sls?: Serverless, options?: Serverless.Options) {
    return new FuncService(
      sls || MockFactory.createTestServerless(),
      options || MockFactory.createTestServerlessOptions(),
    )
  }

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

      const service = createService(sls, options);
      await service.add();

      expect(sls.cli.log).lastCalledWith("Need to provide a name of function to add");
    });

    it("returns with pre-existing function", async () => {
      const sls = MockFactory.createTestServerless();
      const options = MockFactory.createTestServerlessOptions();
      options["name"] = "hello";

      const service = createService(sls, options);
      await service.add();

      expect(sls.cli.log).lastCalledWith("Function hello already exists");
    });

    it("creates function handler and updates serverless.yml", async () => {
      const sls = MockFactory.createTestServerless();
      const options = MockFactory.createTestServerlessOptions();
      const functionName = "myFunction";
      options["name"] = functionName;
      const expectedFunctionsYml = MockFactory.createTestSlsFunctionConfig();
      expectedFunctionsYml[functionName] = MockFactory.createTestFunctionMetadata(functionName);

      const service = createService(sls, options);
      await service.add();

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
      const service = createService(sls, options);
      await service.remove();
      expect(sls.cli.log).lastCalledWith("Need to provide a name of function to remove");
    });

    it("returns with non-existing function", async () => {
      const sls = MockFactory.createTestServerless();
      const options = MockFactory.createTestServerlessOptions();
      options["name"] = "myNonExistingFunction";
      const service = createService(sls, options);
      await service.remove();
      expect(sls.cli.log).lastCalledWith("Function myNonExistingFunction does not exist");
    });

    it("deletes directory and updates serverless.yml", async () => {
      mockFs({
        "hello.js": "contents",
        hello: {
          "function.json": "contents",
        }
      });
      const sls = MockFactory.createTestServerless();
      const options = MockFactory.createTestServerlessOptions();
      const functionName = "hello";
      options["name"] = functionName;
      const unlinkSpy = jest.spyOn(fs, "unlinkSync");
      const rimrafSpy = jest.spyOn(rimraf, "sync");
      const service = createService(sls, options);
      await service.remove();
      expect(unlinkSpy).toBeCalledWith(`${functionName}.js`)
      expect(rimrafSpy).toBeCalledWith(functionName);
      unlinkSpy.mockRestore();
      rimrafSpy.mockRestore();
      const expectedFunctionsYml = MockFactory.createTestSlsFunctionConfig();
      delete expectedFunctionsYml[functionName];
      expect(sls.utils.writeFileSync).toBeCalledWith("serverless.yml", MockFactory.createTestServerlessYml(true, expectedFunctionsYml))
    });

    it("does not try to delete file or directory if they don't exist", async () => {
      mockFs({})
      const sls = MockFactory.createTestServerless();
      const options = MockFactory.createTestServerlessOptions();
      const functionName = "hello";
      options["name"] = functionName;
      const unlinkSpy = jest.spyOn(fs, "unlinkSync");
      const rimrafSpy = jest.spyOn(rimraf, "sync");
      const service = createService(sls, options);
      await service.remove();
      expect(unlinkSpy).not.toBeCalled();
      expect(rimrafSpy).not.toBeCalled();
      unlinkSpy.mockRestore();
      rimrafSpy.mockRestore();
      const expectedFunctionsYml = MockFactory.createTestSlsFunctionConfig();
      delete expectedFunctionsYml[functionName];
      expect(sls.utils.writeFileSync).toBeCalledWith("serverless.yml", MockFactory.createTestServerlessYml(true, expectedFunctionsYml))
    });
  });
});
