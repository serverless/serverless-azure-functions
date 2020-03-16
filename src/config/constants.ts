import { FunctionAppOS } from "./runtime";

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
  bindingsJsonUrl: "https://raw.githubusercontent.com/Azure/azure-functions-templates/master/Functions.Templates/Bindings/bindings.json",
};
