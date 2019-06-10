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
});