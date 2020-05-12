import { FunctionAppOS } from "../config/runtime";

export const constants = {
  bindings: "bindings",
  settings: "settings",
  name: "name",
  displayName: "displayName",
  type: "type",
  direction: "direction",
  trigger: "Trigger",
  inDirection: "in",
  outDirection: "out",
  value: "value",
  resource: "resource",
  required: "required",
  storage: "storage",
  connection: "connection",
  enum: "enum",
  defaultValue: "defaultValue",
  webHookType: "webHookType",
  httpTrigger: "httpTrigger",
  queue: "queue",
  queueName: "queueName",
  xAzureSettings: "x-azure-settings",
  entryPoint: "entryPoint",
  variableKeys: {
    providerConfig: "serverlessAzureProviderConfig",
    subscriptionId: "subscriptionId",
    tenantId: "tenantId",
    appId: "appId",
    packageTimestamp: "packageTimestamp",
    azureCredentials: "azureCredentials",
    os: "os",
  },
  runtimeExtensions: {
    nodejs: ".js",
    python: ".py"
  },
  deployedServiceOptions: {
    resourceGroup: {
      usage: "Resource group for the service",
      shortcut: "g",
    },
    stage: {
      usage: "Stage of service",
      shortcut: "s"
    },
    region: {
      usage: "Region of service",
      shortcut: "r"
    },
    subscriptionId: {
      usage: "Sets the Azure subscription ID",
      shortcut: "i",
    },
    function: {
      usage: "Deployment of individual function - NOT SUPPORTED",
      shortcut: "f",
    }
  },
  invokeOptions: {
    function: {
      usage: "Function to call",
      shortcut: "f",
    },
    path: {
      usage: "Path to file to put in body",
      shortcut: "p"
    },
    data: {
      usage: "Data string for body of request",
      shortcut: "d"
    },
    method: {
      usage: "HTTP method (Default is GET)",
      shortcut: "m"
    },
  },
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
  cliCommandKeys: {
    start: "start"
  },
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
  tmpBuildDir: "tmp_build",
}
