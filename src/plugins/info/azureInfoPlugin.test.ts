import Serverless from "serverless";
import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureInfoPlugin } from "./azureInfoPlugin";

jest.mock("../../services/infoService");
import { AzureInfoService, ServiceInfoType } from "../../services/infoService";

describe("Info Plugin", () => {

  function createPlugin(sls?: Serverless, options?: Serverless.Options) {
    return new AzureInfoPlugin(
      sls || MockFactory.createTestServerless(),
      options || MockFactory.createTestServerlessOptions(),
    )
  }

  beforeAll(() => {
    AzureInfoService.prototype.printInfo = jest.fn();
  });

  it("calls info service to print dry run", async () => {
    const plugin = createPlugin(undefined, { "dryrun": "" } as any);
    await invokeHook(plugin, "info:info");
    expect(AzureInfoService.prototype.printInfo).toBeCalledWith(ServiceInfoType.DRYRUN)
  });

  it("calls info service to print dry run", async () => {
    const plugin = createPlugin();
    await invokeHook(plugin, "info:info");
    expect(AzureInfoService.prototype.printInfo).toBeCalledWith(ServiceInfoType.DEPLOYED)
  });
});
