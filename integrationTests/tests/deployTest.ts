import { CommandValidation } from "clvr";

export const deployTest: CommandValidation[] = [
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
        "Resource Group: sls-weur-dev-${serviceName}-rg",
        "Deploying zip file to function app: sls-weur-dev-${serviceName}",
        "-> hello: [GET] sls-weur-dev-${serviceName}.azurewebsites.net/api/hello"
      ],
    }
  },
  {
    command: `sls invoke -f hello -d ${JSON.stringify({name: "Azure"}).replace(" ", "")}`,
    stdout: {
      shouldContain: [
        "Hello Azure ${runtime}"
      ]
    }
  }
]
