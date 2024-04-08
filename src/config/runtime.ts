export enum Runtime {
  NODE10 = "nodejs10",
  NODE12 = "nodejs12",
  NODE14 = "nodejs14",
  NODE16 = "nodejs16",
  NODE18 = "nodejs18",
  NODE20 = "nodejs20",
  PYTHON36 = "python3.6",
  PYTHON37 = "python3.7",
  PYTHON38 = "python3.8",
  DOTNET22 = "dotnet2.2",
  DOTNET31 = "dotnet3.1",
}

export const supportedRuntimes = [
  Runtime.NODE10,
  Runtime.NODE12,
  Runtime.NODE14,
  Runtime.NODE16,
  Runtime.NODE18,
  Runtime.NODE20,
  Runtime.PYTHON36,
  Runtime.PYTHON37,
  Runtime.PYTHON38,
  Runtime.DOTNET22,
  Runtime.DOTNET31,
];

export const supportedRuntimeSet = new Set(supportedRuntimes);

export enum RuntimeLanguage {
  NODE = "nodejs",
  PYTHON = "python",
  DOTNET = "dotnet",
}

export const supportedLanguages = [
  RuntimeLanguage.NODE,
  RuntimeLanguage.PYTHON,
  RuntimeLanguage.DOTNET,
];

export enum BuildMode {
  RELEASE = "release",
  DEBUG = "debug",
}

export const compiledRuntimes = new Set([Runtime.DOTNET22, Runtime.DOTNET31]);

export function isCompiledRuntime(runtime: Runtime): boolean {
  return compiledRuntimes.has(runtime);
}

export function isNodeRuntime(runtime: Runtime): boolean {
  return getRuntimeLanguage(runtime) === RuntimeLanguage.NODE;
}

export function isPythonRuntime(runtime: Runtime): boolean {
  return getRuntimeLanguage(runtime) === RuntimeLanguage.PYTHON;
}

export function getRuntimeVersion(runtime: Runtime): string {
  for (const language of supportedLanguages) {
    if (runtime.includes(language)) {
      return runtime.replace(language, "");
    }
  }
  throw new Error(`Runtime ${runtime} not included in supportedRuntimes`);
}

export function getRuntimeLanguage(runtime: Runtime): string {
  for (const language of supportedLanguages) {
    if (runtime.includes(language)) {
      return language;
    }
  }
  throw new Error(`Runtime ${runtime} not included in supportedRuntimes`);
}

export function getFunctionWorkerRuntime(runtime: Runtime): string {
  const language = getRuntimeLanguage(runtime);
  if (language === RuntimeLanguage.NODE) {
    return "node";
  }
  return language;
}

export enum FunctionAppOS {
  WINDOWS = "windows",
  LINUX = "linux",
}

export const dockerImages = {
  nodejs10: "NODE|10",
  nodejs12: "NODE|12",
  nodejs14: "NODE|14",
  nodejs16: "NODE|16",
  nodejs18: "NODE|18",
  nodejs20: "NODE|20",
  "python3.6": "PYTHON|3.6",
  "python3.7": "PYTHON|3.7",
  "python3.8": "PYTHON|3.8",
  "dotnet3.1": "DOTNET|3.1",
};
