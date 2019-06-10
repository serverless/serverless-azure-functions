import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzurePackage } from "./azurePackage";

jest.mock("../../shared/bindings");
import { BindingUtils } from "../../shared/bindings";
jest.mock("../../shared/utils");
import { Utils } from "../../shared/utils";

describe("Azure Package Plugin", () => {
  it("sets up provider configuration", async () => {
    const slsFunctionConfig = MockFactory.createTestSlsFunctionConfig();
    const sls = MockFactory.createTestServerless();
    Object.assign(sls.service, {
      functions: slsFunctionConfig
    });

    const functionConfig = Object.keys(slsFunctionConfig).map((funcName) => {
      return {
        name: funcName,
        config: slsFunctionConfig[funcName],
      };
    });

    Utils.getFunctionMetaData = jest.fn((funcName) => slsFunctionConfig[funcName]);
    BindingUtils.createEventsBindings = jest.fn();

    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzurePackage(sls, options);

    await invokeHook(plugin, "package:setupProviderConfiguration");

    expect(sls.cli.log).toBeCalledWith("Building Azure Events Hooks");
    expect(Utils.getFunctionMetaData).toBeCalledWith(functionConfig[0].name, sls);
    expect(BindingUtils.createEventsBindings).toBeCalledWith(sls, functionConfig[0].name, functionConfig[0].config);
  });
});