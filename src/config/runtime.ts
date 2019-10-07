import { FunctionRuntime, SupportedRuntimeLanguage } from "../models/serverless";

export const supportedRuntimes: { [name: string]: FunctionRuntime } = {
  nodejs10: {
    language: SupportedRuntimeLanguage.NODE,
    version: "10"
  },
  nodejs12: {
    language: SupportedRuntimeLanguage.NODE,
    version: "12"
  },
  "python3.6": {
    language: SupportedRuntimeLanguage.PYTHON,
    version: "3.6"
  },
  "python3.7": {
    language: SupportedRuntimeLanguage.PYTHON,
    version: "3.7"
  },
  "python3.8": {
    language: SupportedRuntimeLanguage.PYTHON,
    version: "3.8"
  },
}

export const dockerImages = {
  nodejs10: "NODE|10",
  nodejs12: "NODE|12",
  "python3.6": "PYTHON|3.6",
  "python3.7": "PYTHON|3.7",
  "python3.8": "PYTHON|3.8",
}