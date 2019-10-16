import mockFs from "mock-fs";
import mockSpawn from "mock-spawn";
import path from "path";
import rimraf from "rimraf";
import Serverless from "serverless";
import { FunctionMetadata } from "../shared/utils";
import { MockFactory } from "../test/mockFactory";
import { PackageService } from "./packageService";

import fs from "fs";

jest.mock("rimraf");

describe("Package Service", () => {
  let sls: Serverless;
  let packageService: PackageService;
  const functionRoute = "myRoute";

  beforeEach(() => {
    sls = MockFactory.createTestServerless();
    sls.config.servicePath = process.cwd();
    sls.service["functions"] = {
      hello: MockFactory.createTestAzureFunctionConfig(functionRoute),
      eventhubHandler: MockFactory.createTestEventHubFunctionConfig(),
    }
    packageService = new PackageService(sls, MockFactory.createTestServerlessOptions());
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("cleans up previous .serverless folder", async () => {
    mockFs({
      ".serverless": {
        "artifact.zip": "contents"
      }
    });

    packageService.cleanUpServerlessDir();
    expect(rimraf.sync).toBeCalledWith(path.join(process.cwd(), ".serverless"));
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
    const functionName = "hello";
    const functionMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: "src/handlers/hello",
      params: {
        functionJson: {
          bindings: [
            MockFactory.createTestHttpBinding("out"),
            MockFactory.createTestHttpBinding("in"),
          ]
        }
      },
    };

    const expectedFolderPath = path.join(sls.config.servicePath, functionName);
    const expectedFilePath = path.join(expectedFolderPath, "function.json");
    const expectedFunctionJson = {
      entryPoint: "handler",
      scriptFile: "src/handlers/hello",
      bindings: [
        MockFactory.createTestHttpBinding("out"),
        {
          ...MockFactory.createTestHttpBinding("in"),
          route: functionRoute
        }
      ]

    }

    mockFs({});

    const mkdirSpy = jest.spyOn(fs, "mkdirSync");
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");

    await packageService.createBinding(functionName, functionMetadata);

    expect(mkdirSpy).toBeCalledWith(expectedFolderPath);
    mkdirSpy.mockRestore();

    const call = writeFileSpy.mock.calls[0] as string[];
    writeFileSpy.mockRestore();

    expect(call[0]).toEqual(expectedFilePath);
    expect(JSON.parse(call[1])).toEqual(expectedFunctionJson);
  });

  it("Creates Event Hub Handler bindings and function.json ", async () => {
    const functionName = "eventhubHandler";
    const functionMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: "src/handlers/eventhubHandler",
      params: {
        functionJson: {
          bindings: [
            MockFactory.createTestEventHubBinding("in"),
          ]
        }
      },
    };

    const expectedFolderPath = path.join(sls.config.servicePath, functionName);
    const expectedFilePath = path.join(expectedFolderPath, "function.json");
    const expectedFunctionJson = {
      entryPoint: "handler",
      scriptFile: "src/handlers/eventhubHandler",
      bindings: [
        MockFactory.createTestEventHubBinding("in"),
      ]
    }

    mockFs({});

    const mkdirSpy = jest.spyOn(fs, "mkdirSync");
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");

    await packageService.createBinding(functionName, functionMetadata);

    expect(mkdirSpy).toBeCalledWith(expectedFolderPath);
    mkdirSpy.mockRestore();

    const call = writeFileSpy.mock.calls[0] as string[];
    writeFileSpy.mockRestore();
    expect(call[0]).toEqual(expectedFilePath);
    expect(JSON.parse(call[1])).toEqual(expectedFunctionJson);

  });

  it("createBinding does not need to create directory if function folder already exists", async () => {
    const functionName = "hello";
    const functionMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: "src/handlers/hello",
      params: {
        functionJson: {
          bindings: [
            MockFactory.createTestHttpBinding("out"),
            MockFactory.createTestHttpBinding("in"),
          ]
        },
      },
    };

    const expectedFolderPath = path.join(sls.config.servicePath, functionName);
    const expectedFilePath = path.join(expectedFolderPath, "function.json");

    mockFs({
      "hello": {
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

  it("webpack copies required", async () => {
    mockFs({
      // Generated by webpack plugin
      ".webpack": {
        "serivce": {}
      },
      // Generated by azure package plugin
      "host.json": "contents",
      "hello": {
        "function.json": "contents",
      },
      "goodbye": {
        "function.json": "contents",
      },
    });

    const destinationPath = path.join(".webpack", "service");

    const copyFileSpy = jest.spyOn(fs, "copyFileSync");

    await packageService.prepareWebpack();

    expect(copyFileSpy).toBeCalledWith("host.json", path.join(destinationPath, "host.json"));

    sls.service.getAllFunctions().forEach((functionName) => {
      const functionJsonFilePath = path.join(functionName, "function.json");
      expect(copyFileSpy).toBeCalledWith(functionJsonFilePath, path.join(destinationPath, functionJsonFilePath));
    });

    copyFileSpy.mockRestore();
  });

  describe("Python packages", () => {
    let mySpawn;
    let packageService: PackageService;
    let functions: string[];

    beforeEach(() => {
      mySpawn = mockSpawn();
      require("child_process").spawn = mySpawn;
      mySpawn.setDefault(mySpawn.simple(0, "Exit code"));

      const sls = MockFactory.createTestServerless();
      functions = sls.service.getAllFunctions();
      sls.service.provider.runtime = "python3.6";
      packageService = new PackageService(sls, {} as any);
    });

    function calledWithArgs(mockFn: any, values: string[]) {
      const calls = mockFn.mock.calls;
      for (const value of values) {
        expect(calls.find((call) => call[0] === value)).toBeTruthy();
      }
    }

    it("generates python files", async () => {
      const writeSpy = jest.spyOn(fs, "writeFileSync");
      mockFs({});
      await packageService.createBindings();
      mockFs.restore();
      calledWithArgs(writeSpy, [
        ".funcignore",
        ...functions.map((name) => `${name}${path.sep}function.json`)
      ]);
      writeSpy.mockRestore();
    });

    it("creates a python package", async () => {
      Object.defineProperty(process, "platform", {
        value: "darwin",
        writable: true,
      });
      const fsConfig = {}
      fsConfig[path.basename(process.cwd()) + ".zip"] = ""
      mockFs(fsConfig);

      await packageService.createPackage();
      const calls = mySpawn.calls;
      expect(calls).toHaveLength(1);
      const call = calls[0];
      expect(call.command).toEqual(path.join("node_modules", ".bin", "func"));
      expect(call.args).toEqual(["pack"]);
    });

    it("cleans up python files", async () => {
      const rimrafSpy = jest.spyOn(rimraf, "sync");
      const unlinkSpy = jest.spyOn(fs, "unlinkSync");
      mockFs({
        ".funcignore": "",
        "serverless-azure-functions.zip": "",
        "hello" : {
          "__pycache__": {
            "file.pyc": ""
          },
          "function.json": ""
        },
        "goodbye" : {
          "__pycache__": {
            "file.pyc": ""
          },
          "function.json": "",
        },
      });
      await packageService.cleanUp();
      mockFs.restore();
      calledWithArgs(unlinkSpy, [
        ".funcignore",
        ...functions.map((name) => `${name}${path.sep}function.json`)
      ]);
      unlinkSpy.mockRestore();
      calledWithArgs(rimrafSpy, [
        ...functions.map((name) => path.join(name, "__pycache__")),
      ]);
      rimrafSpy.mockRestore();
    });
  });
});
