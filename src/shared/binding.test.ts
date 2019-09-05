import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { BindingUtils } from "./bindings";
import mockFs from "mock-fs";

describe("Bindings", () => {
  let sls: Serverless;

  afterEach(() => {
    mockFs.restore();
  });

  beforeEach(() => {
    sls = MockFactory.createTestServerless();
    sls.config.servicePath = process.cwd();
    jest.clearAllMocks();
  });

  it("should get bindings metadata from serverless", () => {
    expect(sls).not.toBeNull();
    BindingUtils.getBindingsMetaData(sls);
    expect(sls.cli.log).toBeCalledWith("Parsing Azure Functions Bindings.json...");
  });

  it("Http output bindings should default to 'res'", () => {
    const binding = BindingUtils.getHttpOutBinding();

    expect(binding).toMatchObject({
      type: "http",
      direction: "out",
      name: "res"
    });
  });

  it("Gets the http binding with default settings", () => {
    const serverless = MockFactory.createTestServerless();
    const parsedBindings = BindingUtils.getBindingsMetaData(serverless);
    const bindingType = "http";

    const bindingTypes = parsedBindings.bindingTypes;
    const bindingTypeIndex = bindingTypes.indexOf(bindingType);
    const bindingSettings = parsedBindings.bindingSettings[bindingTypeIndex];

    const binding = BindingUtils.getBinding(bindingType, bindingSettings, {});

    expect(binding).toMatchObject({
      type: "http",
      direction: "out",
      name: "res",
    });
  });

  it("Gets the http binding with custom name", () => {
    const serverless = MockFactory.createTestServerless();
    const parsedBindings = BindingUtils.getBindingsMetaData(serverless);
    const bindingType = "http";
    const userSettings = { name: "custom" };

    const bindingTypes = parsedBindings.bindingTypes;
    const bindingTypeIndex = bindingTypes.indexOf(bindingType);
    const bindingSettings = parsedBindings.bindingSettings[bindingTypeIndex];

    const binding = BindingUtils.getBinding(bindingType, bindingSettings, userSettings);

    expect(binding).toMatchObject({
      type: "http",
      direction: "out",
      name: userSettings.name,
    });
  });
});
