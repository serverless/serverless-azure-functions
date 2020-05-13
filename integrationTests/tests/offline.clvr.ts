import run from "clvr";
import { defaultParameters } from "../parameters";

run({
  name: "Offline Test",
  parameters: defaultParameters,
  validations: [
    {
      command: "npm i serverless-azure-functions@beta",
      silent: true,
      files: {
        "hello/function.json": {
          shouldExist: false
        }
      }
    },
    {
      command: "sls offline build",
      stdout: {
        shouldContain: [
          "Building offline service",
          "Finished building offline service"
        ]
      },
      files: {
        "hello/function.json": {
          shouldExist: true
        }
      }
    },
    {
      command: "sls offline cleanup",
      stdout: {
        shouldContain: [
          "Cleaning up offline files",
          "Finished cleaning up offline files"
        ]
      },
      files: {
        "hello/function.json": {
          shouldExist: false
        }
      }
    }
  ]
});
