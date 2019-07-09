import fs from "fs";
import mockFs from "mock-fs";
import path from "path";
import Serverless from "serverless";
import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureOfflinePlugin } from "./azureOfflinePlugin";

jest.mock("../../services/offlineService")
import { OfflineService } from "../../services/offlineService"

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
    expect(OfflineService.prototype.build).toBeCalled();
  });

  it("invokes offline hook", async () => {
    const sls = MockFactory.createTestServerless();
    const plugin = createPlugin(sls);
    await invokeHook(plugin, "offline:offline");
    expect(OfflineService.prototype.start).toBeCalled();
  });

  it("invokes cleanup hook", async () => {
    const sls = MockFactory.createTestServerless();
    const plugin = createPlugin(sls);
    await invokeHook(plugin, "offline:cleanup:cleanup");
    expect(OfflineService.prototype.cleanup).toBeCalled();
  });
});
