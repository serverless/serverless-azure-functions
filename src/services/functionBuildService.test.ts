import path from "path";
import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { FunctionBuildService, FunctionMetadata } from "./functionBuildService";

describe("utils", () => {
  let sls: Serverless;
  let functionBuildService: FunctionBuildService;

  beforeEach(() => {
    sls = MockFactory.createTestServerless();
    functionBuildService = new FunctionBuildService(sls, {} as any);
    jest.clearAllMocks();
  });

  it("resolves handler when handler code is outside function folders", () => {
    sls.service["functions"].hello.handler = "src/handlers/hello.handler";
    MockFactory.updateService(sls);

    const functions = sls.service.getAllFunctions();
    const metadata = functionBuildService.getFunctionMetaData(functions[0]);

    const expectedMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: path.normalize("../src/handlers/hello.js"),
      params: expect.anything(),
    };

    expect(metadata).toEqual(expectedMetadata);
  });

  it("resolves handler when code is in function folder", () => {
    sls.service["functions"].hello.handler = "hello/index.handler";
    MockFactory.updateService(sls);

    const functions = sls.service.getAllFunctions();
    const metadata = functionBuildService.getFunctionMetaData(functions[0]);

    const expectedMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: path.normalize("index.js"),
      params: expect.anything(),
    };

    expect(metadata).toEqual(expectedMetadata);
  });

  it("resolves handler when code is at the project root", () => {
    sls.service["functions"].hello.handler = "hello.handler";
    MockFactory.updateService(sls);

    const functions = sls.service.getAllFunctions();
    const metadata = functionBuildService.getFunctionMetaData(functions[0]);

    const expectedMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: path.normalize("../hello.js"),
      params: expect.anything(),
    };

    expect(metadata).toEqual(expectedMetadata);
  });

  it("should get incoming binding", () => {
    expect(functionBuildService.getIncomingBindingConfig(MockFactory.createTestAzureFunctionConfig())).toEqual(
      {
        http: true,
        "x-azure-settings": MockFactory.createTestHttpBinding("in"),
      }
    );
  });

  it("should get outgoing binding", () => {
    expect(functionBuildService.getOutgoingBinding(MockFactory.createTestAzureFunctionConfig())).toEqual(
      {
        http: true,
        "x-azure-settings": MockFactory.createTestHttpBinding("out"),
      }
    );
  });

  it("should get bindings metadata from serverless", () => {
    expect(sls).not.toBeNull();
    functionBuildService.getBindingsMetaData(sls);
    expect(sls.cli.log).toBeCalledWith("Parsing Azure Functions Bindings.json...");
  });

  it("Http output bindings should default to 'res'", () => {
    const binding = functionBuildService.getHttpOutBinding();

    expect(binding).toMatchObject({
      type: "http",
      direction: "out",
      name: "res"
    });
  });

  it("Gets the http binding with default settings", () => {
    const serverless = MockFactory.createTestServerless();
    const parsedBindings = functionBuildService.getBindingsMetaData(serverless);
    const bindingType = "http";

    const bindingTypes = parsedBindings.bindingTypes;
    const bindingTypeIndex = bindingTypes.indexOf(bindingType);
    const bindingSettings = parsedBindings.bindingSettings[bindingTypeIndex];

    const binding = functionBuildService.getBinding(bindingType, bindingSettings, {});

    expect(binding).toMatchObject({
      type: "http",
      direction: "out",
      name: "res",
    });
  });

  it("Gets the http binding with custom name", () => {
    const serverless = MockFactory.createTestServerless();
    const parsedBindings = functionBuildService.getBindingsMetaData(serverless);
    const bindingType = "http";
    const userSettings = { name: "custom" };

    const bindingTypes = parsedBindings.bindingTypes;
    const bindingTypeIndex = bindingTypes.indexOf(bindingType);
    const bindingSettings = parsedBindings.bindingSettings[bindingTypeIndex];

    const binding = functionBuildService.getBinding(bindingType, bindingSettings, userSettings);

    expect(binding).toMatchObject({
      type: "http",
      direction: "out",
      name: userSettings.name,
    });
  });
});
