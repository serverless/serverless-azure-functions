import run from "clvr";
import { defaultParameters } from "../parameters";

run({
  name: "Deploy Test",
  parameters: defaultParameters,
  validations: [
    {
      command: "npm i serverless-azure-functions@beta",
      silent: true,
    },
    {
      command: "sls package",
    },
    {
      command: "sls deploy -p .serverless/${serviceName}.zip",
      retries: 3,
      stdout: {
        shouldContain: [
          "Logging into Azure",
          "Deployed serverless functions:",
          "tmp-${region}-qa-${serviceName}-rg",
          "Resource Group: tmp-${region}-qa-${serviceName}-rg",
          "Deploying zip file to function app: tmp-${region}-qa-${serviceName}",
          "-> hello: [GET] tmp-${region}-qa-${serviceName}.azurewebsites.net/api/hello"
        ],
      }
    },
    {
      command: `sls invoke -f hello -d ${JSON.stringify({name: "Azure"}).replace(" ", "")}`,
      retries: 3,
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
      retries: 3,
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
      retries: 3,
      stdout: {
        shouldContain: [
          "Service successfully removed"
        ]
      }
    },
  ]
});
