import fs from "fs";
import {vol} from "memfs"
import mockSpawn from "mock-spawn";
import { BuildMode, Runtime } from "../config/runtime";
import { ServerlessAzureConfig } from "../models/serverless";
import { MockFactory } from "../test/mockFactory";
import { CompilerService } from "./compilerService";

describe("Compiler Service", () => {
  let mySpawn;
  const mkdirSpy = jest.spyOn(fs, "mkdirSync");

  beforeEach(() => {
    vol.fromNestedJSON({}, process.cwd());
    mySpawn = mockSpawn();
    require("child_process").spawn = mySpawn;
    mySpawn.setDefault(mySpawn.simple(0, "Exit code"));
  });

  afterAll(() => {
    vol.reset();
  });
  
  (it as any).onWindows("spawns a release build process on windows", async () => {
    const service = createService();
    await service.build(BuildMode.RELEASE);
    const calls = mySpawn.calls;
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call.command.endsWith("cmd.exe")).toBe(true);
    // expect(call.args).toEqual([
    //   "/d",
    //   "/s",
    //   "/c",
    //   "\"dotnet ^\"build^\" ^\"--configuration^\" ^\"release^\" ^\"--framework^\" ^\"netcoreapp3.1^\" ^\"--output^\" ^\"tmp_build^\"\""
    // ]);
    //expect(mkdirSpy).toBeCalled();
  });

  (it as any).onMac("spawns a release build process on mac", async () => {
    const service = createService();
    await service.build(BuildMode.RELEASE);
    const calls = mySpawn.calls;
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call.command).toEqual("dotnet");
    expect(call.args).toEqual(["build", "--configuration", "release", "--framework", "netcoreapp3.1", "--output", "tmp_build"]);
    expect(mkdirSpy).toBeCalled();
  });

  (it as any).onLinux("spawns a release build process on mac", async () => {
    const service = createService();
    await service.build(BuildMode.RELEASE);
    const calls = mySpawn.calls;
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call.command).toEqual("dotnet");
    expect(call.args).toEqual(["build", "--configuration", "release", "--framework", "netcoreapp3.1", "--output", "tmp_build"]);
    expect(mkdirSpy).toBeCalled();
  });

  function createService() {
    const sls = MockFactory.createTestServerless();
    (sls.service as any as ServerlessAzureConfig).provider.runtime = Runtime.DOTNET31;
    const options = MockFactory.createTestServerlessOptions();
    return new CompilerService(sls, options);
  }
});