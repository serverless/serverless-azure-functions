import { defaultParameters } from "../parameters";
import clvr from "clvr";

clvr({
  name: "Offline Test",
  parameters: defaultParameters,
  validations: [
    {
      command: "npm link serverless-azure-functions",
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
