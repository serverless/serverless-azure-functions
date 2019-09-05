import Serverless from "serverless";
import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureApimServicePlugin } from "./azureApimServicePlugin";

jest.mock("../../services/apimService");
import { ApimService } from "../../services/apimService";

describe("APIM Service Plugin", () => {
  it("is defined", () => {
    expect(AzureApimServicePlugin).toBeDefined();
  });

  it("can be instantiated", () => {
    const serverless = MockFactory.createTestServerless();
    const options: Serverless.Options = {
      stage: "",
      region: "",
    }
    const plugin = new AzureApimServicePlugin(serverless, options);

    expect(plugin).not.toBeNull();
  });

  it("calls APIM service deploy", async () => {
    const deploy = jest.fn();

    ApimService.prototype.deploy = deploy;

    const sls = MockFactory.createTestServerless();
    sls.service.provider["apim"] = "apim config"
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureApimServicePlugin(sls, options);

    await invokeHook(plugin, "after:deploy:deploy");

    expect(sls.cli.log).toBeCalledWith("Starting APIM service deployment")
    expect(deploy).toBeCalled();
    expect(sls.cli.log).lastCalledWith("Finished APIM service deployment")
  });

  it("does not call deploy API or deploy functions when \"apim\" not included in config", async () => {
    const deploy = jest.fn();

    ApimService.prototype.deploy = deploy;

    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureApimServicePlugin(sls, options);

    await invokeHook(plugin, "after:deploy:deploy");

    expect(sls.cli.log).not.toBeCalled()
    expect(deploy).not.toBeCalled();
  });
});
