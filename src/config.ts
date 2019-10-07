import { FunctionAppOS } from "./models/serverless";

export const configConstants = {
  bearer: "Bearer ",
  deploymentConfig: {
    container: "deployment-artifacts",
    rollback: true,
    external: false,
  },
  naming: {
    maxLength: {
      storageAccount: 24,
      deploymentName: 64,
    },
    suffix: {
      deployment: "DEPLOYMENT",
      artifact: "ARTIFACT",
    }
  },
  functionAppApiPath: "/api/",
  functionAppDomain: ".azurewebsites.net",
  functionsAdminApiPath: "/admin/functions/",
  functionsApiPath: "/api/functions",
  func: {
    command: "func",
    start: ["host", "start"],
    pack: ["pack"],
    publish: ["azure", "functionapp", "publish"]
  },
  funcConsoleColor: "blue",
  runFromPackageSetting: "WEBSITE_RUN_FROM_PACKAGE",
  jsonContentType: "application/json",
  logInvocationsApiPath: "/azurejobs/api/functions/definitions/",
  logOutputApiPath: "/azurejobs/api/log/output/",
  logStreamApiPath: "/api/logstream/application/functions/function/",
  masterKeyApiPath: "/api/functions/admin/masterkey",
  providerName: "azure",
  scmCommandApiPath: "/api/command",
  scmDomain: ".scm.azurewebsites.net",
  scmVfsPath: "/api/vfs/site/wwwroot/",
  scmZipDeployApiPath: "/api/zipdeploy",
  resourceGroupHashLength: 6,
  defaults: {
    awsRegion: "us-east-1",
    region: "westus",
    stage: "dev",
    prefix: "sls",
    localPort: 7071,
    os: FunctionAppOS.WINDOWS,
  },
  dockerImages: {
    node: {
      "8": "DOCKER|microsoft/azure-functions-node8:2.0",
      "10": "DOCKER|microsoft/azure-functions/node:2.0"
    },
    python: {
      "3.6": "DOCKER|microsoft/azure-functions/python:2.0"
    }
  },
  defaultFuncIgnore: [
    "package.json",
    "package-lock.json",
    "README.md",
    ".gitignore",
    ".git/**",
    ".vscode/**",
    "node_modules/**",
    "local.settings.json",
    ".serverless/**",
  ]
};

export default configConstants;
