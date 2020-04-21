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
  }
}
