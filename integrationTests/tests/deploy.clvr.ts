import run from "clvr";
import { defaultParameters } from "../parameters";

run({
  name: "Deploy Test",
  parameters: defaultParameters,
  validations: [
    {
      command: "npm i ../../../", // relative path to package.json (local package)
      silent: true,
    },
    {
      command: "sls package",
    },
    {
      command: "sls deploy -p .serverless/${serviceName}.zip",
      retries: 0,
      stdout: {
        shouldContain: [
          "Logging into Azure",
          "Deployed serverless functions:",
          "int-${region}-qa-${serviceName}-rg",
          "-> hello: [GET] int-${region}-qa-${serviceName}.azurewebsites.net/api/hello"
        ],
      }
    },
    {
      command: `sls invoke -f hello -d ${JSON.stringify({name: "Azure"}).replace(" ", "")}`,
      retries: 0,
      stdout: {
        shouldContain: [
          "Hello Azure ${runtime}",
          "Environment variable: foo"
        ]
      },
      stderr: {
        shouldBeExactly: ""
      }
    },
    {
      command: `sls invoke apim -f hello -d ${JSON.stringify({name: "Azure"}).replace(" ", "")}`,
      retries: 0,
      stdout: {
        shouldContain: [
          "Hello Azure ${runtime}",
          "Environment variable: foo"
        ]
      },
      stderr: {
        shouldBeExactly: ""
      },
    },
    {
      command: "sls remove --force",
      retries: 0,
      stdout: {
        shouldContain: [
          "Service successfully removed"
        ]
      }
    },
  ]
});
