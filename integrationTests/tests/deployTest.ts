import { CommandValidation } from "clvr";

export const deployTest: CommandValidation[] = [
  {
    command: "npm i serverless-azure-functions@beta",
    silent: true,
  },
  {
    command: "sls deploy",
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
    // Deploy again to check that ARM deployment was skipped
    command: "sls deploy",
    stdout: {
      shouldContain: [
        "Generated template same as previous. Skipping ARM deployment"
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
