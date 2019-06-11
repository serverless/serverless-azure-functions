import Serverless from "serverless";
import mockFs from "mock-fs";
import fs from "fs";
import path from "path";
import { PackageService } from "./packageService";
import { MockFactory } from "../test/mockFactory";
import { FunctionMetadata } from "../shared/utils";

describe("Package Service", () => {
  let sls: Serverless;
  let packageService: PackageService;

  beforeEach(() => {
    const slsFunctionConfig = MockFactory.createTestSlsFunctionConfig();
    sls = MockFactory.createTestServerless();
    sls.config.servicePath = process.cwd();

    Object.assign(sls.service, {
      functions: slsFunctionConfig
    });

    packageService = new PackageService(sls);
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("cleans up function.json and function folders", async () => {
    const fsConfig = {};
    const functionNames = sls.service.getAllFunctions();

    functionNames.forEach((functionName) => {
      fsConfig[functionName] = {
        "function.json": "contents",
      };
    });

    mockFs(fsConfig);

    const unlinkSpy = jest.spyOn(fs, "unlinkSync");
    const rmdirSpy = jest.spyOn(fs, "rmdirSync");

    packageService.cleanUp();

    expect(unlinkSpy).toBeCalledTimes(functionNames.length);
    expect(rmdirSpy).toBeCalledTimes(functionNames.length);

    unlinkSpy.mockRestore();
    rmdirSpy.mockRestore();
  });

  it("cleans up function.json but does not delete function folder", async () => {
    const fsConfig = {};

    const functionNames = sls.service.getAllFunctions();
    functionNames.forEach((functionName) => {
      fsConfig[functionName] = {
        "function.json": "contents",
        "index.js": "contents",
      };
    });

    mockFs(fsConfig);

    const unlinkSpy = jest.spyOn(fs, "unlinkSync");
    const rmdirSpy = jest.spyOn(fs, "rmdirSync");

    packageService.cleanUp();

    expect(unlinkSpy).toBeCalledTimes(functionNames.length);
    expect(rmdirSpy).not.toBeCalled();

    unlinkSpy.mockRestore();
    rmdirSpy.mockRestore();
  });

  it("createBinding writes function.json files into function folder", async () => {
    const functionName = "helloWorld";
    const functionMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: "src/handlers/hello.js",
      params: {
        functionsJson: {},
      },
    };

    const expectedFolderPath = path.join(sls.config.servicePath, functionName);
    const expectedFilePath = path.join(expectedFolderPath, "function.json");

    mockFs({});

    const mkdirSpy = jest.spyOn(fs, "mkdirSync");
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");

    await packageService.createBinding(functionName, functionMetadata);

    expect(mkdirSpy).toBeCalledWith(expectedFolderPath);
    expect(writeFileSpy).toBeCalledWith(expectedFilePath, expect.any(String));

    mkdirSpy.mockRestore();
    writeFileSpy.mockRestore();
  });

  it("createBinding does not need to create directory if function folder already exists", async () => {
    const functionName = "helloWorld";
    const functionMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: "src/handlers/hello.js",
      params: {
        functionsJson: {},
      },
    };

    const expectedFolderPath = path.join(sls.config.servicePath, functionName);
    const expectedFilePath = path.join(expectedFolderPath, "function.json");

    mockFs({
      "helloWorld": {
        "index.js": "contents",
      },
    });

    sls.utils.dirExistsSync = jest.fn(() => true);
    const mkdirSpy = jest.spyOn(fs, "mkdirSync");
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");

    await packageService.createBinding(functionName, functionMetadata);

    expect(mkdirSpy).not.toBeCalledWith(expectedFolderPath);
    expect(writeFileSpy).toBeCalledWith(expectedFilePath, expect.any(String));

    mkdirSpy.mockRestore();
    writeFileSpy.mockRestore();
  });
});