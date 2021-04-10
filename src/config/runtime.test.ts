import { Runtime, isNodeRuntime, isPythonRuntime, getRuntimeVersion, getRuntimeLanguage, getFunctionWorkerRuntime } from "./runtime";


describe("Runtime", () => {
  it("identifies node runtimes correctly", () => {
    expect(isNodeRuntime(Runtime.NODE10)).toBe(true);
    expect(isNodeRuntime(Runtime.NODE12)).toBe(true);
    expect(isNodeRuntime(Runtime.NODE14)).toBe(true);
    expect(isNodeRuntime(Runtime.PYTHON36)).toBe(false);
    expect(isNodeRuntime(Runtime.PYTHON37)).toBe(false);
    expect(isNodeRuntime(Runtime.PYTHON38)).toBe(false);
  });

  it("identifies python runtimes correctly", () => {
    expect(isPythonRuntime(Runtime.NODE10)).toBe(false);
    expect(isPythonRuntime(Runtime.NODE12)).toBe(false);
    expect(isPythonRuntime(Runtime.NODE14)).toBe(false);
    expect(isPythonRuntime(Runtime.PYTHON36)).toBe(true);
    expect(isPythonRuntime(Runtime.PYTHON37)).toBe(true);
    expect(isPythonRuntime(Runtime.PYTHON38)).toBe(true);
  });

  it("gets runtime version", () => {
    expect(getRuntimeVersion(Runtime.NODE10)).toBe("10");
    expect(getRuntimeVersion(Runtime.NODE12)).toBe("12");
    expect(getRuntimeVersion(Runtime.NODE14)).toBe("14");
    expect(getRuntimeVersion(Runtime.PYTHON36)).toBe("3.6");
    expect(getRuntimeVersion(Runtime.PYTHON37)).toBe("3.7");
    expect(getRuntimeVersion(Runtime.PYTHON38)).toBe("3.8");
  });

  it("gets runtime language", () => {
    expect(getRuntimeLanguage(Runtime.NODE10)).toBe("nodejs");
    expect(getRuntimeLanguage(Runtime.NODE12)).toBe("nodejs");
    expect(getRuntimeLanguage(Runtime.NODE14)).toBe("nodejs");
    expect(getRuntimeLanguage(Runtime.PYTHON36)).toBe("python");
    expect(getRuntimeLanguage(Runtime.PYTHON37)).toBe("python");
    expect(getRuntimeLanguage(Runtime.PYTHON38)).toBe("python");
  });

  it("gets function worker runtime", () => {
    expect(getFunctionWorkerRuntime(Runtime.NODE10)).toBe("node");
    expect(getFunctionWorkerRuntime(Runtime.NODE12)).toBe("node");
    expect(getFunctionWorkerRuntime(Runtime.NODE14)).toBe("node");
    expect(getFunctionWorkerRuntime(Runtime.PYTHON36)).toBe("python");
    expect(getFunctionWorkerRuntime(Runtime.PYTHON37)).toBe("python");
    expect(getFunctionWorkerRuntime(Runtime.PYTHON38)).toBe("python");
    expect(getFunctionWorkerRuntime(Runtime.DOTNET31)).toBe("dotnet");
    expect(getFunctionWorkerRuntime(Runtime.DOTNET22)).toBe("dotnet");
  });
});
