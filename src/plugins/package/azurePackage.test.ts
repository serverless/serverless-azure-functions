import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzurePackage } from "./azurePackage"

jest.mock("../../shared/bindings");
import { BindingUtils } from "../../shared/bindings";
jest.mock("../../shared/utils");
import { Utils, FunctionMetadata } from "../../shared/utils";

describe("Azure Package Plugin", () => {
  it("sets up provider configuration", async () => {
    const metadata = "metadata";
    const functionName = "function1";

    const getFunctionMetaDataFn = jest.fn(() => metadata as any as FunctionMetadata);
    const createEventsBindingsFn = jest.fn();

    Utils.getFunctionMetaData = getFunctionMetaDataFn
    BindingUtils.createEventsBindings = createEventsBindingsFn

    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzurePackage(sls, options);

    await invokeHook(plugin, "package:setupProviderConfiguration");

    expect(sls.cli.log).toBeCalledWith("Building Azure Events Hooks");
    expect(getFunctionMetaDataFn).toBeCalledWith(functionName, sls);
    expect(createEventsBindingsFn).toBeCalledWith(sls.config.servicePath, functionName, metadata);
  });
});