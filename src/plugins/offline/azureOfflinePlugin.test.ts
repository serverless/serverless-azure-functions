import fs from "fs";
import mockFs from "mock-fs";
import path from "path";
import Serverless from "serverless";
import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureOfflinePlugin } from "./azureOfflinePlugin";

describe("Azure Offline Plugin", () => {

  function createPlugin(sls?: Serverless, options?: Serverless.Options) {
    return new AzureOfflinePlugin(
      sls || MockFactory.createTestServerless(),
      options || MockFactory.createTestServerlessOptions(),
    )
  }

  beforeAll(() => {
    mockFs({})
  });

  afterAll(() => {
    mockFs.restore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  })

  it("invokes build hook", async () => {
    const sls = MockFactory.createTestServerless();
    const plugin = createPlugin(sls);
    await invokeHook(plugin, "offline:build:build");
    const calls = (sls.utils.writeFileSync as any).mock.calls;
    const functionNames = sls.service.getAllFunctions();
    const expectedFunctionJson = MockFactory.createTestBindingsObject();
    for (let i = 0; i < calls.length; i++) {
      const name = functionNames[i];
      expect(calls[i][0]).toEqual(`${name}${path.sep}function.json`)
      expect(JSON.parse(calls[i][1])).toEqual(expectedFunctionJson);
    }
  });

  it("invokes offline hook", async () => {
    const sls = MockFactory.createTestServerless();
    const plugin = createPlugin(sls);
    await invokeHook(plugin, "offline:offline");
    // Trivial test for now. In the future, this process
    // may spawn the start process itself rather than telling
    // the user how to do it.
    expect(sls.cli.log).toBeCalledTimes(3);
  });

  it("invokes cleanup hook", async () => {
    const unlinkSpy = jest.spyOn(fs, "unlinkSync");
    const rmdirSpy = jest.spyOn(fs, "rmdirSync")
    const sls = MockFactory.createTestServerless();
    const plugin = createPlugin(sls);
    await invokeHook(plugin, "offline:cleanup:cleanup");
    const unlinkCalls = unlinkSpy.mock.calls;
    expect(unlinkCalls[0][0]).toBe(`hello${path.sep}function.json`);
    expect(unlinkCalls[1][0]).toBe(`goodbye${path.sep}function.json`);
    const rmdirCalls = rmdirSpy.mock.calls;
    expect(rmdirCalls[0][0]).toBe("hello");
    expect(rmdirCalls[1][0]).toBe("goodbye");
  });
});