import run from "clvr";
import { defaultParameters } from "../parameters";

run({
  name: "Deploy Test",
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
    // {
    //   command: "serverless deploy -p .serverless/${serviceName}.zip",
    //   retries: 3,
    //   stdout: {
    //     shouldContain: [
    //       "Logging into Azure",
    //       "Deployed serverless functions:",
    //       "int-${region}-qa-${serviceName}-rg",
    //       "-> hello: [GET] int-${region}-qa-${serviceName}.azurewebsites.net/api/hello"
    //     ],
    //   }
    // },
    // {
    //   command: `serverless invoke -f hello -d ${JSON.stringify({name: "Azure"}).replace(" ", "")}`,
    //   retries: 3,
    //   stdout: {
    //     shouldContain: [
    //       "Hello Azure ${runtime}",
    //       "Environment variable: foo"
    //     ]
    //   },
    //   stderr: {
    //     shouldBeExactly: ""
    //   }
    // },
    // {
    //   command: `serverless invoke apim -f hello -d ${JSON.stringify({name: "Azure"}).replace(" ", "")}`,
    //   retries: 3,
    //   stdout: {
    //     shouldContain: [
    //       "Hello Azure ${runtime}",
    //       "Environment variable: foo"
    //     ]
    //   },
    //   stderr: {
    //     shouldBeExactly: ""
    //   },
    // },
    // {
    //   command: "serverless remove --force",
    //   retries: 3,
    //   stdout: {
    //     shouldContain: [
    //       "Service successfully removed"
    //     ]
    //   }
    // },
  ]
});
