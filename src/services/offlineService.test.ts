import fs from "fs";
import {vol} from "memfs"
import mockSpawn from "mock-spawn";
import path from "path";
import Serverless from "serverless";
import { BuildMode, Runtime } from "../config/runtime";
import { ServerlessAzureConfig } from "../models/serverless";
import { MockFactory } from "../test/mockFactory";
import { OfflineService } from "./offlineService";

jest.mock("./compilerService");
import { CompilerService } from "./compilerService";

describe("Offline Service", () => {
  let mySpawn;

  function createService(sls?: Serverless, options?: any): OfflineService {
    return new OfflineService(
      sls || MockFactory.createTestServerless(),
      MockFactory.createTestServerlessOptions(options),
    )
  }

  beforeEach(() => {
    // Mocking the file system so that files are not created in project directory
    vol.fromNestedJSON({});

    mySpawn = mockSpawn();
    require("child_process").spawn = mySpawn;
    mySpawn.setDefault(mySpawn.simple(0, "Exit code"));
  });

  afterEach(() => {
    vol.reset();
    jest.resetAllMocks();
  });

  it("builds required files for offline execution", async () => {
    const sls = MockFactory.createTestServerless();
    const service = createService(sls);
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    await service.build();
    const calls = writeFileSpy.mock.calls;
    writeFileSpy.mockRestore();
    const functionNames = sls.service.getAllFunctions();
    expect(calls).toHaveLength(functionNames.length);
    for (let i = 0; i < functionNames.length; i++) {
      const name = functionNames[i];
      const call = calls.find((c) => c[0] === `${name}${path.sep}function.json`);
      expect(call).toBeTruthy();
      
      expect(
        JSON.parse(call[1] as string)
      ).toEqual(
        MockFactory.createTestBindingsObject(`../${name}.js`)
      );
    }
    // expect(calls.find((c) => c[0] === "local.settings.json")).toBeTruthy();

    writeFileSpy.mockRestore();
  });

  it("compiles files when building for compiled runtime", async () => {
    const sls = MockFactory.createTestServerless();
    (sls.service as any as ServerlessAzureConfig).provider.runtime = Runtime.DOTNET31;
    const service = createService(sls);
    await service.build();
    expect(CompilerService.prototype.build).toBeCalledWith(BuildMode.DEBUG);
  });

  it("does not write files if they already exist", async () => {
    const sls = MockFactory.createTestServerless();
    const service = createService(sls);
    const functionNames = sls.service.getAllFunctions();
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    vol.fromNestedJSON({
      "local.settings.json": "contents",
    });
    await service.build();
    const calls = writeFileSpy.mock.calls;
    writeFileSpy.mockRestore();
    expect(calls).toHaveLength(functionNames.length);
  });

  it("cleans up functions files", async () => {
    vol.fromNestedJSON({
      hello: {
        "function.json": "contents"
      },
      goodbye: {
        "function.json": "contents"
      },
      "local.settings.json": "contents",
    })
    const sls = MockFactory.createTestServerless();
    const service = createService(sls);
    const unlinkSpy = jest.spyOn(fs, "unlinkSync");
    const rmdirSpy = jest.spyOn(fs, "rmdirSync");
    await service.cleanup();
    const unlinkCalls = unlinkSpy.mock.calls;
    unlinkSpy.mockRestore();

    expect(unlinkCalls).toHaveLength(2);
    expect(unlinkCalls[0][0]).toBe(`hello${path.sep}function.json`);
    expect(unlinkCalls[1][0]).toBe(`goodbye${path.sep}function.json`);
    const rmdirCalls = rmdirSpy.mock.calls;
    expect(rmdirCalls[0][0]).toBe("hello");
    expect(rmdirCalls[1][0]).toBe("goodbye");
    rmdirSpy.mockRestore();
  });

  it("does not try to remove files if they don't exist", async () => {
    vol.fromNestedJSON({
      hello: {
        "function.json": "contents"
      },
      goodbye: {
        "function.json": "contents"
      },
    })
    const sls = MockFactory.createTestServerless();
    const service = createService(sls);
    const unlinkSpy = jest.spyOn(fs, "unlinkSync");
    const rmdirSpy = jest.spyOn(fs, "rmdirSync");
    await service.cleanup();
    const unlinkCalls = unlinkSpy.mock.calls;
    unlinkSpy.mockRestore();
    expect(unlinkCalls).toHaveLength(2);
    expect(unlinkCalls[0][0]).toBe(`hello${path.sep}function.json`);
    expect(unlinkCalls[1][0]).toBe(`goodbye${path.sep}function.json`);
    const rmdirCalls = rmdirSpy.mock.calls;
    expect(rmdirCalls[0][0]).toBe("hello");
    expect(rmdirCalls[1][0]).toBe("goodbye");
    rmdirSpy.mockRestore();
  });

  (describe as any).onMac("MacOS tests", () => {
    it("calls func host start", async () => {
      const sls = MockFactory.createTestServerless();
      const service = createService(sls);
      await service.start();
      const calls = mySpawn.calls;
      expect(calls).toHaveLength(1);
      const call = calls[0];
      expect(call.command).toEqual(path.join("node_modules", ".bin", "func"));
      expect(call.args).toEqual(["host", "start"]);
    });
  
    it("cleans up after offline call as default behavior", async () => {
      vol.fromNestedJSON({
        hello: {
          "function.json": "contents"
        },
        goodbye: {
          "function.json": "contents"
        },
        "local.settings.json": "contents",
      });
  
      const sls = MockFactory.createTestServerless();
      const processOnSpy = jest.spyOn(process, "on");
      const unlinkSpy = jest.spyOn(fs, "unlinkSync");
      const rmdirSpy = jest.spyOn(fs, "rmdirSync")
  
      const service = createService(sls);
  
      await service.start();
  
      const calls = mySpawn.calls;
      expect(calls).toHaveLength(1);
      const call = calls[0];
      expect(call.command).toEqual(path.join("node_modules", ".bin", "func"));
      //expect(call.args).toEqual(["host", "start"]);
  
      const processOnCalls = processOnSpy.mock.calls;
      expect(processOnCalls).toHaveLength(1);
      expect(processOnCalls[0][0]).toEqual("SIGINT");
      expect(processOnCalls[0][1]).toBeInstanceOf(Function);
  
      // SIGINT handler function
      const sigintCallback = processOnCalls[0][1] as any;
  
      process.exit = jest.fn() as any;
      await sigintCallback();
      expect(process.exit).toBeCalledTimes(1);
  
      /* Offline Cleanup assertions*/
  
      const unlinkCalls = unlinkSpy.mock.calls;
      unlinkSpy.mockRestore();
   
      expect(unlinkCalls).toHaveLength(2);
      expect(unlinkCalls[0][0]).toBe(`hello${path.sep}function.json`);
      expect(unlinkCalls[1][0]).toBe(`goodbye${path.sep}function.json`);
   
      const rmdirCalls = rmdirSpy.mock.calls;
      rmdirSpy.mockRestore();
   
      expect(rmdirCalls[0][0]).toBe("hello");
      expect(rmdirCalls[1][0]).toBe("goodbye");
    });
  
    it("adds additional arguments to spawned process if passed through Serverless args", async () => {
      const sls = MockFactory.createTestServerless();
  
      const service = createService(sls, { "spawnargs": "--cors *"});
  
      await service.start();
  
      const calls = mySpawn.calls;
      expect(calls).toHaveLength(1);
      const call = calls[0];
      expect(call.command).toEqual(path.join("node_modules", ".bin", "func"));
      expect(call.args).toEqual([
        "/d",
        "/s",
        "/c",
        `"${path.join("node_modules", ".bin", "func")} ^^^"host^^^" ^^^"start^^^" ^^^"--cors^^^^" ^^^"^^^*^^^""`
      ]);
    });
  
    it("does not clean up after offline call if specified in options", async () => {
      const processOnSpy = jest.spyOn(process, "on");
      const unlinkSpy = jest.spyOn(fs, "unlinkSync");
      const rmdirSpy = jest.spyOn(fs, "rmdirSync");
  
      const sls = MockFactory.createTestServerless();
  
      const service = createService(sls, {
        "nocleanup": ""
      });
  
      await service.start();
  
      const calls = mySpawn.calls;
      expect(calls).toHaveLength(1);
      const call = calls[0];
      expect(call.command).toEqual(path.join("node_modules", ".bin", "func"));
      expect(call.args).toEqual([
        "/d",
        "/s",
        "/c",
        `"${path.join("node_modules", ".bin", "func")} ^^^"host^^^" ^^^"start^^^""`
      ]);
  
      const processOnCalls = processOnSpy.mock.calls;
      expect(processOnCalls).toHaveLength(1);
      expect(processOnCalls[0][0]).toEqual("SIGINT");
      expect(processOnCalls[0][1]).toBeInstanceOf(Function);
  
      // SIGINT handler function
      const sigintCallback = processOnCalls[0][1] as any;
  
      process.exit = jest.fn() as any;
      await sigintCallback();
      expect(process.exit).toBeCalledTimes(1);
  
      /* Offline Cleanup assertions*/
  
      expect(unlinkSpy).not.toBeCalled();
      expect(rmdirSpy).not.toBeCalled();
  
      unlinkSpy.mockRestore();
      rmdirSpy.mockRestore();
    });
  });

  (describe as any).onLinux("Linux tests", () => {
    it("calls func host start", async () => {
      const sls = MockFactory.createTestServerless();
      const service = createService(sls);
      await service.start();
      const calls = mySpawn.calls;
      expect(calls).toHaveLength(1);
      const call = calls[0];
      expect(call.command).toEqual(path.join("node_modules", ".bin", "func"));
      expect(call.args).toEqual([
        "/d",
        "/s",
        "/c",
        `"${path.join("node_modules", ".bin", "func")} ^^^"host^^^" ^^^"start^^^""`
      ]);
    });
  
    it("cleans up after offline call as default behavior", async () => {
      vol.fromNestedJSON({
        hello: {
          "function.json": "contents"
        },
        goodbye: {
          "function.json": "contents"
        },
        "local.settings.json": "contents",
      });
  
      const sls = MockFactory.createTestServerless();
      const processOnSpy = jest.spyOn(process, "on");
      const unlinkSpy = jest.spyOn(fs, "unlinkSync");
      const rmdirSpy = jest.spyOn(fs, "rmdirSync")
  
      const service = createService(sls);
  
      await service.start();
  
      const calls = mySpawn.calls;
      expect(calls).toHaveLength(1);
      const call = calls[0];
      expect(call.command).toEqual(path.join("node_modules", ".bin", "func"));
      expect(call.args).toEqual([
        "/d",
        "/s",
        "/c",
        `"${path.join("node_modules", ".bin", "func")} ^^^"host^^^" ^^^"start^^^""`
      ]);
  
      const processOnCalls = processOnSpy.mock.calls;
      expect(processOnCalls).toHaveLength(1);
      expect(processOnCalls[0][0]).toEqual("SIGINT");
      expect(processOnCalls[0][1]).toBeInstanceOf(Function);
  
      // SIGINT handler function
      const sigintCallback = processOnCalls[0][1] as any;
  
      process.exit = jest.fn() as any;
      await sigintCallback();
      expect(process.exit).toBeCalledTimes(1);
  
      /* Offline Cleanup assertions*/
  
      const unlinkCalls = unlinkSpy.mock.calls;
      unlinkSpy.mockRestore();
   
      expect(unlinkCalls).toHaveLength(2);
      expect(unlinkCalls[0][0]).toBe(`hello${path.sep}function.json`);
      expect(unlinkCalls[1][0]).toBe(`goodbye${path.sep}function.json`);
   
      const rmdirCalls = rmdirSpy.mock.calls;
      rmdirSpy.mockRestore();
   
      expect(rmdirCalls[0][0]).toBe("hello");
      expect(rmdirCalls[1][0]).toBe("goodbye");
    });
  
    it("adds additional arguments to spawned process if passed through Serverless args", async () => {
      const sls = MockFactory.createTestServerless();
  
      const service = createService(sls, { "spawnargs": "--cors *"});
  
      await service.start();
  
      const calls = mySpawn.calls;
      expect(calls).toHaveLength(1);
      const call = calls[0];
      expect(call.command).toEqual(path.join("node_modules", ".bin", "func"));
      expect(call.args).toEqual([
        "/d",
        "/s",
        "/c",
        `"${path.join("node_modules", ".bin", "func")} ^^^"host^^^" ^^^"start^^^" ^^^"--cors^^^^" ^^^"^^^*^^^""`
      ]);
    });
  
    it("does not clean up after offline call if specified in options", async () => {
      const processOnSpy = jest.spyOn(process, "on");
      const unlinkSpy = jest.spyOn(fs, "unlinkSync");
      const rmdirSpy = jest.spyOn(fs, "rmdirSync");
  
      const sls = MockFactory.createTestServerless();
  
      const service = createService(sls, {
        "nocleanup": ""
      });
  
      await service.start();
  
      const calls = mySpawn.calls;
      expect(calls).toHaveLength(1);
      const call = calls[0];
      expect(call.command).toEqual(path.join("node_modules", ".bin", "func"));
      expect(call.args).toEqual([
        "/d",
        "/s",
        "/c",
        `"${path.join("node_modules", ".bin", "func")} ^^^"host^^^" ^^^"start^^^""`
      ]);
  
      const processOnCalls = processOnSpy.mock.calls;
      expect(processOnCalls).toHaveLength(1);
      expect(processOnCalls[0][0]).toEqual("SIGINT");
      expect(processOnCalls[0][1]).toBeInstanceOf(Function);
  
      // SIGINT handler function
      const sigintCallback = processOnCalls[0][1] as any;
  
      process.exit = jest.fn() as any;
      await sigintCallback();
      expect(process.exit).toBeCalledTimes(1);
  
      /* Offline Cleanup assertions*/
  
      expect(unlinkSpy).not.toBeCalled();
      expect(rmdirSpy).not.toBeCalled();
  
      unlinkSpy.mockRestore();
      rmdirSpy.mockRestore();
    });
  });

  (describe as any).onWindows("Windows tests", () => {
    it("calls func host start", async () => {
      const sls = MockFactory.createTestServerless();
      const service = createService(sls);
      await service.start();
      const calls = mySpawn.calls;
      expect(calls).toHaveLength(1);
      const call = calls[0];
      expect(call.command.endsWith("cmd.exe")).toBe(true);
      expect(call.args).toEqual([
        "/d",
        "/s",
        "/c",
        `"${path.join("node_modules", ".bin", "func")} ^^^"host^^^" ^^^"start^^^""`
      ]);
    });
  
    it("cleans up after offline call as default behavior", async () => {
      vol.fromNestedJSON({
        hello: {
          "function.json": "contents"
        },
        goodbye: {
          "function.json": "contents"
        },
        "local.settings.json": "contents",
      });
  
      const sls = MockFactory.createTestServerless();
      const processOnSpy = jest.spyOn(process, "on");
      const unlinkSpy = jest.spyOn(fs, "unlinkSync");
      const rmdirSpy = jest.spyOn(fs, "rmdirSync")
  
      const service = createService(sls);
  
      await service.start();
  
      const calls = mySpawn.calls;
      expect(calls).toHaveLength(1);
      const call = calls[0];
      expect(call.command.endsWith("cmd.exe")).toBe(true);
      const processOnCalls = processOnSpy.mock.calls;
      expect(processOnCalls).toHaveLength(1);
      expect(processOnCalls[0][0]).toEqual("SIGINT");
      expect(processOnCalls[0][1]).toBeInstanceOf(Function);
  
      // SIGINT handler function
      const sigintCallback = processOnCalls[0][1] as any;
  
      process.exit = jest.fn() as any;
      await sigintCallback();
      expect(process.exit).toBeCalledTimes(1);
  
      /* Offline Cleanup assertions*/
  
      const unlinkCalls = unlinkSpy.mock.calls;
      unlinkSpy.mockRestore();
   
      expect(unlinkCalls).toHaveLength(2);
      expect(unlinkCalls[0][0]).toBe(`hello${path.sep}function.json`);
      expect(unlinkCalls[1][0]).toBe(`goodbye${path.sep}function.json`);
   
      const rmdirCalls = rmdirSpy.mock.calls;
      rmdirSpy.mockRestore();
   
      expect(rmdirCalls[0][0]).toBe("hello");
      expect(rmdirCalls[1][0]).toBe("goodbye");
    });
  
    it("adds additional arguments to spawned process if passed through Serverless args", async () => {
      const sls = MockFactory.createTestServerless();
  
      const service = createService(sls, { "spawnargs": "--cors *"});
  
      await service.start();
  
      const calls = mySpawn.calls;
      expect(calls).toHaveLength(1);
      const call = calls[0];expect(call.command.endsWith("cmd.exe")).toBe(true);
      expect(call.args).toEqual([
        "/d",
        "/s",
        "/c",
        `"${path.join("node_modules", ".bin", "func")} ^^^"host^^^" ^^^"start^^^" ^^^"--cors^^^" ^^^"^^^*^^^""`
      ]);
    });
  
    it("does not clean up after offline call if specified in options", async () => {
      const processOnSpy = jest.spyOn(process, "on");
      const unlinkSpy = jest.spyOn(fs, "unlinkSync");
      const rmdirSpy = jest.spyOn(fs, "rmdirSync");
  
      const sls = MockFactory.createTestServerless();
  
      const service = createService(sls, {
        "nocleanup": ""
      });
  
      await service.start();
  
      const calls = mySpawn.calls;
      expect(calls).toHaveLength(1);
      const call = calls[0];
      expect(call.command.endsWith("cmd.exe")).toBe(true);
      expect(call.args).toEqual([
        "/d",
        "/s",
        "/c",
        `"${path.join("node_modules", ".bin", "func")} ^^^"host^^^" ^^^"start^^^""`
      ]);
  
      const processOnCalls = processOnSpy.mock.calls;
      expect(processOnCalls).toHaveLength(1);
      expect(processOnCalls[0][0]).toEqual("SIGINT");
      expect(processOnCalls[0][1]).toBeInstanceOf(Function);
  
      // SIGINT handler function
      const sigintCallback = processOnCalls[0][1] as any;
  
      process.exit = jest.fn() as any;
      await sigintCallback();
      expect(process.exit).toBeCalledTimes(1);
  
      /* Offline Cleanup assertions*/
  
      expect(unlinkSpy).not.toBeCalled();
      expect(rmdirSpy).not.toBeCalled();
  
      unlinkSpy.mockRestore();
      rmdirSpy.mockRestore();
    });
  });
});
