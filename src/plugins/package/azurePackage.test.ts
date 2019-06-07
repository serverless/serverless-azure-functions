import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzurePackage } from "./azurePackage";
import fs from "fs";
import mockFs from "mock-fs";

jest.mock("../../shared/bindings");
import { BindingUtils } from "../../shared/bindings";
jest.mock("../../shared/utils");
import { Utils } from "../../shared/utils";

describe("Azure Package Plugin", () => {
  afterEach(() => {
    mockFs.restore();
    jest.resetAllMocks();
  });

  it("sets up provider configuration", async () => {
    const slsFunctionConfig = MockFactory.createTestSlsFunctionConfig();
    const sls = MockFactory.createTestServerless();

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
    expect(BindingUtils.createEventsBindings).toBeCalledWith(sls.config.servicePath, functionConfig[0].name, functionConfig[0].config);
  });

  it("cleans up function.json and function folders", async () => {
    const slsFunctionConfig = MockFactory.createTestSlsFunctionConfig();
    const sls = MockFactory.createTestServerless();
    Object.assign(sls.service, {
      functions: slsFunctionConfig
    });

    const fsConfig = {};

    const functionNames = sls.service.getAllFunctions();
    functionNames.forEach((functionName) => {
      fsConfig[functionName] = {
        "function.json": "contents",
      };
    });

    mockFs(fsConfig, { createCwd: true });

    const unlinkSpy = jest.spyOn(fs, "unlinkSync");
    const rmdirSpy = jest.spyOn(fs, "rmdirSync");

    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzurePackage(sls, options);

    await invokeHook(plugin, "package:finalize");

    expect(unlinkSpy).toBeCalledTimes(functionNames.length);
    expect(rmdirSpy).toBeCalledTimes(functionNames.length);
  });

  it("cleans up function.json but does not delete function folder", async () => {
    const slsFunctionConfig = MockFactory.createTestSlsFunctionConfig();
    const sls = MockFactory.createTestServerless();
    Object.assign(sls.service, {
      functions: slsFunctionConfig
    });

    const fsConfig = {};

    const functionNames = sls.service.getAllFunctions();
    functionNames.forEach((functionName) => {
      fsConfig[functionName] = {
        "function.json": "contents",
        "index.js": "contents",
      };
    });

    mockFs(fsConfig, { createCwd: true });

    const unlinkSpy = jest.spyOn(fs, "unlinkSync");
    const rmdirSpy = jest.spyOn(fs, "rmdirSync");

    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzurePackage(sls, options);

    await invokeHook(plugin, "package:finalize");

    expect(unlinkSpy).toBeCalledTimes(functionNames.length);
    expect(rmdirSpy).not.toBeCalled();
  });
});