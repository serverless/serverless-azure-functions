import fs from "fs";
import mockFs from "mock-fs";
import mockSpawn from "mock-spawn";
import path from "path";
import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { OfflineService } from "./offlineService";

describe("Offline Service", () => {
  let mySpawn;

  function createService(sls?: Serverless): OfflineService {
    return new OfflineService(
      sls || MockFactory.createTestServerless(),
      MockFactory.createTestServerlessOptions(),
    )
  }

  beforeEach(() => {
    // Mocking the file system so that files are not created in project directory
    mockFs({});

    mySpawn = mockSpawn();
    require("child_process").spawn = mySpawn;
    mySpawn.setDefault(mySpawn.simple(0, "Exit code"));
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("builds required files for offline execution", async () => {
    const sls = MockFactory.createTestServerless();
    const service = createService(sls);
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    await service.build();
    const calls = writeFileSpy.mock.calls;
    const functionNames = sls.service.getAllFunctions();
    expect(calls).toHaveLength(functionNames.length + 1);
    for (let i = 0; i < functionNames.length; i++) {
      const name = functionNames[i];
      expect(calls[i][0]).toEqual(`${name}${path.sep}function.json`)
      expect(
        JSON.parse(calls[i][1])
      ).toEqual(
        MockFactory.createTestBindingsObject(`..${path.sep}${name}.js`)
      );
    }
    expect(calls[calls.length - 1][0]).toEqual("local.settings.json");
    writeFileSpy.mockRestore();
  });

  it("does not write files if they already exist", async () => {
    const sls = MockFactory.createTestServerless();
    const service = createService(sls);
    const functionNames = sls.service.getAllFunctions();
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    mockFs({
      "local.settings.json": "contents",
    });
    await service.build();
    const calls = writeFileSpy.mock.calls;
    expect(calls).toHaveLength(functionNames.length);
  });

  it("cleans up functions files", async () => {
    mockFs({
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
    const rmdirSpy = jest.spyOn(fs, "rmdirSync")
    await service.cleanup();
    const unlinkCalls = unlinkSpy.mock.calls;
    expect(unlinkCalls[0][0]).toBe(`hello${path.sep}function.json`);
    expect(unlinkCalls[1][0]).toBe(`goodbye${path.sep}function.json`);
    expect(unlinkCalls[2][0]).toBe("local.settings.json");
    const rmdirCalls = rmdirSpy.mock.calls;
    expect(rmdirCalls[0][0]).toBe("hello");
    expect(rmdirCalls[1][0]).toBe("goodbye");
    unlinkSpy.mockRestore();
    rmdirSpy.mockRestore();
  });

  it("does not try to remove files if they don't exist", async () => {
    mockFs({
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
    const rmdirSpy = jest.spyOn(fs, "rmdirSync")
    await service.cleanup();
    const unlinkCalls = unlinkSpy.mock.calls;
    expect(unlinkCalls).toHaveLength(2);
    expect(unlinkCalls[0][0]).toBe(`hello${path.sep}function.json`);
    expect(unlinkCalls[1][0]).toBe(`goodbye${path.sep}function.json`);
    const rmdirCalls = rmdirSpy.mock.calls;
    expect(rmdirCalls[0][0]).toBe("hello");
    expect(rmdirCalls[1][0]).toBe("goodbye");
    unlinkSpy.mockRestore();
    rmdirSpy.mockRestore();
  });

  it("calls func host start on Mac OS", async () => {
    Object.defineProperty(process, "platform", {
      value: "darwin",
      writable: true,
    });

    const sls = MockFactory.createTestServerless();
    const service = createService(sls);
    await service.start();
    const calls = mySpawn.calls;
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call.command).toEqual("func");
    expect(call.args).toEqual(["host", "start"]);
  });

  it("calls func host start on windows", async () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
      writable: true,
    });

    const sls = MockFactory.createTestServerless();
    const service = createService(sls);
    await service.start();
    const calls = mySpawn.calls;
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call.command).toEqual("func.cmd");
    expect(call.args).toEqual(["host", "start"]);
  });
});
