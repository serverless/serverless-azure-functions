import run from "clvr";
import { defaultParameters } from "../parameters";

run({
  name: "Deploy Test",
  parameters: defaultParameters,
  validations: [
    {
      command: "npm i serverless-azure-functions@beta"
    },
    {
      command: "sls deploy",
      stdout: {
        shouldContain: [
          "Logging into Azure",
          "Deployed serverless functions:",
          "sls-weur-dev-${serviceName}-rg",
          "Resource Group: tmp-weur-qa-${serviceName}-rg",
          "Deploying zip file to function app: tmp-weur-qa-${serviceName}",
          "-> hello: [GET] tmp-weur-qa-${serviceName}.azurewebsites.net/api/hello"
        ],
      }
    },
    {
      command: `sls invoke -f hello -d ${JSON.stringify({name: "Azure"}).replace(" ", "")}`,
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
      command: "sls remove --force",
      stdout: {
        shouldContain: [
          "Service successfully removed"
        ]
      }
    },
  ]
});
