import run from "clvr";
import { defaultParameters } from "../parameters";

run({
  name: "Package Tests",
  parameters: defaultParameters,
  validations: [
    {
      // relative path to package.json so that we run the rest of the tests using the updated package
      command: "npm i ../../../",
      silent: true,
    },
    {
      command: "serverless package",
      stdout: {
        shouldContain: [
          "Serverless: Initializing provider configuration...",
          "Serverless: Parsing Azure Functions Bindings.json...",
          "Serverless: Building binding for function: hello event: httpTrigger",
        ],
      }
    },
  ]
});
