
export enum Runtime {
  NODE10 = "nodejs10",
  NODE12 = "nodejs12",
  PYTHON36 = "python3.6",
  PYTHON37 = "python3.7",
  PYTHON38 = "python3.8",
}

export const supportedRuntimes = [
  Runtime.NODE10,
  Runtime.NODE12,
  Runtime.PYTHON36,
  Runtime.PYTHON37,
  Runtime.PYTHON38,
]

export const supportedRuntimeSet = new Set(supportedRuntimes);

export enum RuntimeLanguages {
  NODE = "nodejs",
  PYTHON = "python",
}

export const supportedLanguages = [
  RuntimeLanguages.NODE,
  RuntimeLanguages.PYTHON,
]

export function isNodeRuntime(runtime: Runtime): boolean {
  return getRuntimeLanguage(runtime) === RuntimeLanguages.NODE;
}

export function isPythonRuntime(runtime: Runtime): boolean {
  return getRuntimeLanguage(runtime) === RuntimeLanguages.PYTHON;
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

export enum FunctionAppOS {
  WINDOWS = "windows",
  LINUX = "linux"
}

export const dockerImages = {
  nodejs10: "NODE|10",
  nodejs12: "NODE|12",
  "python3.6": "PYTHON|3.6",
  "python3.7": "PYTHON|3.7",
  "python3.8": "PYTHON|3.8",
}