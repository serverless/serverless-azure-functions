import Serverless from "serverless";
import { FunctionAppOS, Runtime } from "../config/runtime";
import { ApiManagementConfig } from "./apiManagement";
import { ArmDeployment, ArmParameters } from "./armTemplates";

export interface ArmTemplateConfig {
  file: string;
  parameters: ArmParameters;
}

export interface ResourceConfig {
  name?: string;
  sku?: {
    name?: string;
    tier?: string;
  };
  [key: string]: any;
}

export interface FunctionAppConfig extends ResourceConfig {
  nodeVersion?: string;
  workerRuntime?: string;
  extensionVersion?;
}

export interface DeploymentConfig {
  rollback?: boolean;
  container?: string;
  external?: boolean;
}

export interface ServerlessAzureProvider {
  type?: string;
  prefix?: string;
  region: string;
  stage: string;
  name: string;
  subscriptionId?: string;
  tenantId?: string;
  appId?: string;
  environment?: {
    [key: string]: any;
  };
  tags?: {
    [tagName: string]: string;
  };
  deployment?: DeploymentConfig;
  deploymentName?: string;
  resourceGroup?: string;
  apim?: ApiManagementConfig;
  functionApp?: FunctionAppConfig;
  appInsights?: ResourceConfig;
  appServicePlan?: AppServicePlanConfig;
  storageAccount?: ResourceConfig;
  hostingEnvironment?: ResourceConfig;
  virtualNetwork?: ResourceConfig;
  armTemplate?: ArmTemplateConfig;
  keyVaultConfig?: AzureKeyVaultConfig;
  /** Runtime setting within `serverless.yml` */
  runtime: Runtime;
  os?: FunctionAppOS;
}

/**
 * Defines the Azure Key Vault configuration
 */
export interface AzureKeyVaultConfig {
  /** The name of the azure key vault */
  name: string;
  /** The name of the azure resource group with the key vault */
  resourceGroup: string;
}

export interface AppServicePlanConfig extends ResourceConfig {
  scale?: {
    minWorkerCount?: number;
    maxWorkerCount?: number;
    workerSizeId?: string;
  };
  hostingEnvironment?: string;
}

/**
 * Expanding type of incomplete `Serverless` type.
 */
export interface ServerlessObject {
  /** Input provided by user */
  processedInput: {
    /** Commands issued after `serverless` */
    commands: ServerlessCliCommand[];
    /** Flags provided in CLI */
    options: any;
  };
  /** Provider specific configuration */
  service: ServerlessAzureConfig;
  /** Provider agnostic configuration */
  config: ServerlessConfig;
}

/**
 * Commands that can be issued in CLI
 */
export enum ServerlessCliCommand {
  /** Package service */
  PACKAGE = "package",
  /** Deploy service */
  DEPLOY = "deploy",
  /** Invoke HTTP endpoint */
  INVOKE = "invoke",
  /** Roll back service */
  ROLLBACK = "rollback",
  /** Run service offline */
  OFFLINE = "offline",
  /** Start pre-built offline service - subcommand for offline*/
  START = "start",
  /** Build an offline service - subcommand for offline */
  BUILD = "build",
  /** Cleanup files from offline build - subcommand for offline */
  CLEANUP = "cleanup",
  /** List deployments - subcommand for deploy */
  LIST = "list",
  /** Command to add or remove functions */
  FUNC = "func",
  /** Add a function - subcommand for func */
  ADD = "add",
  /** Remove a function - subcommand for func */
  REMOVE = "remove"
}

/** Vendor agnostic Serverless configuration */
export interface ServerlessConfig {
  /** Path to root Serverless service */
  servicePath: string;
  /** Path to packaged artifact of service */
  packagePath: string;
}

export interface ServerlessAzureConfig {
  service: string;
  provider: ServerlessAzureProvider;
  plugins: string[];
  functions: any;
  package?: {
    individually: boolean;
    artifactDirectoryName: string;
    artifact: string;
    exclude: string[];
    include: string[];
  };
}

export interface ServerlessAzureFunctionConfig {
  handler: string;
  events: ServerlessAzureFunctionBindingConfig[];
}

export interface ServerlessAzureFunctionBindingConfig {
  http?: boolean;
  "x-azure-settings": ServerlessExtraAzureSettingsConfig;
}

export interface ServerlessExtraAzureSettingsConfig {
  direction?: string;
  route?: string;
  name?: string;
  authLevel?: string;
  methods?: string[];
}

export interface ServerlessCommand {
  usage: string;
  lifecycleEvents: string[];
  options?: {
    [key: string]: {
      usage: string;
      shortcut?: string;
    };
  };
  commands?: ServerlessCommandMap;
}

export interface ServerlessHookMap {
  [eventName: string]: Promise<any>;
}

export interface ServerlessCommandMap {
  [command: string]: ServerlessCommand;
}

export interface ServerlessAzureOptions extends Serverless.Options {
  prefix?: string;
  resourceGroup?: string;
}

export interface ServerlessLogOptions {
  underline?: boolean;
  bold?: boolean;
  color?: string;
}

export interface AzureResourceInfo {
  name: string;
  resourceType: string;
  region: string;
}

export interface AzureFunctionAppInfo {
  name: string;
  functions: string[];
}

export interface AzureFunctionInfo {
  name: string;
  enabled?: boolean;
}

export interface ServiceInfo {
  resourceGroup: string;
  isDryRun: boolean;
  resources: AzureResourceInfo[];
  functionApp?: AzureFunctionAppInfo;
  deployment?: ArmDeployment;
}
