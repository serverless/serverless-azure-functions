import Serverless from "serverless";
import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureOfflinePlugin } from "./azureOfflinePlugin";

jest.mock("../../services/offlineService")
import { OfflineService } from "../../services/offlineService"


describe("Azure Offline Plugin", () => {
  let plugin: AzureOfflinePlugin;

  function createPlugin(sls?: Serverless, options?: Serverless.Options) {
    return new AzureOfflinePlugin(
      sls || MockFactory.createTestServerless(),
      options || MockFactory.createTestServerlessOptions(),
    )
  }
  beforeEach(() => {
    jest.resetAllMocks();
    plugin = createPlugin();
  });

  it("can be instantiated", () => {
    expect(plugin).not.toBeNull();
  });

  it("create function bindings when calling build", async () => {
    await invokeHook(plugin, "offline:build:build");
    expect(OfflineService.prototype.build).toBeCalled();
  });

  it("create function bindings before offline:offline lifecyle event", async () => {
    await invokeHook(plugin, "before:offline:offline");
    expect(OfflineService.prototype.build).toBeCalled();
  });

  it("call offline service's start method when invoking offline command ", async () => {
    await invokeHook(plugin, "offline:offline");
    expect(OfflineService.prototype.start).toBeCalled();
  });

  it("clean up files created for offline development when invoking cleanup command", async () => {
    await invokeHook(plugin, "offline:cleanup:cleanup");
    expect(OfflineService.prototype.cleanup).toBeCalled();
  });
});
