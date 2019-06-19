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

  beforeEach(() => {
    mockFs({})
  });

  afterEach(() => {
    mockFs.restore();
  })

  it("invokes build hook", async () => {
    const sls = MockFactory.createTestServerless();
    const plugin = createPlugin(sls);
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    await invokeHook(plugin, "offline:build:build");
    const calls = writeFileSpy.mock.calls;
    const functionNames = sls.service.getAllFunctions();
    expect(calls).toHaveLength(functionNames.length + 1);
    for (let i = 0; i < functionNames.length; i++) {
      const name = functionNames[i];
      expect(calls[i][0]).toEqual(`${name}${path.sep}function.json`)
      expect(
        JSON.parse(calls[i][1])
      ).toEqual(
        MockFactory.createTestBindingsObject(`..${path.sep}${name}.js`)
      );
    }
    expect(calls[calls.length - 1][0]).toEqual("local.settings.json");
    writeFileSpy.mockRestore();
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
    mockFs({
      hello: {
        "function.json": "contents"
      },
      goodbye: {
        "function.json": "contents"
      },
      "local.settings.json": "contents",
    });
    const unlinkSpy = jest.spyOn(fs, "unlinkSync");
    const rmdirSpy = jest.spyOn(fs, "rmdirSync")
    const sls = MockFactory.createTestServerless();
    const plugin = createPlugin(sls);
    await invokeHook(plugin, "offline:cleanup:cleanup");
    const unlinkCalls = unlinkSpy.mock.calls;
    expect(unlinkCalls[0][0]).toBe(`hello${path.sep}function.json`);
    expect(unlinkCalls[1][0]).toBe(`goodbye${path.sep}function.json`);
    expect(unlinkCalls[2][0]).toBe("local.settings.json");
    const rmdirCalls = rmdirSpy.mock.calls;
    expect(rmdirCalls[0][0]).toBe("hello");
    expect(rmdirCalls[1][0]).toBe("goodbye");
    unlinkSpy.mockRestore();
    rmdirSpy.mockRestore();
  });
});