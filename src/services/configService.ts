import Serverless from "serverless";
import Service from "serverless/classes/Service";
import { CliCommand, CliCommandFactory } from "../config/cliCommandFactory";
import { BuildMode, FunctionAppOS, isNodeRuntime, isPythonRuntime, Runtime, supportedRuntimes, supportedRuntimeSet, isCompiledRuntime } from "../config/runtime";
import { DeploymentConfig, ServerlessAzureConfig, ServerlessAzureFunctionConfig } from "../models/serverless";
import { constants } from "../shared/constants";
import { Utils } from "../shared/utils";
import { AzureNamingService, AzureNamingServiceOptions } from "./namingService";

/**
 * Handles all Service Configuration
 */
export class ConfigService {

  /** Configuration for service */
  private config: ServerlessAzureConfig;

  /** CLI Command Factory */
  private cliCommandFactory: CliCommandFactory;

  public constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.config = this.initializeConfig(serverless.service);
    this.cliCommandFactory = new CliCommandFactory();
    this.registerCliCommands();
  }

  /**
   * Get Azure Provider Configuration
   */
  public getConfig(): ServerlessAzureConfig {
    return this.config;
  }

  /**
   * Name of Azure Region for deployment
   */
  public getRegion(): string {
    return this.config.provider.region;
  }

  /**
   * Name of current deployment stage
   */
  public getStage(): string {
    return this.config.provider.stage;
  }

  /**
   * Prefix for service
   */
  public getPrefix(): string {
    return this.config.provider.prefix;
  }

  /**
   * Name of current resource group
   */
  public getResourceGroupName(): string {
    return this.config.provider.resourceGroup;
  }

  /**
   * Azure Subscription ID
   */
  public getSubscriptionId(): string {
    return this.getOption(constants.variableKeys.subscriptionId)
      || process.env.AZURE_SUBSCRIPTION_ID
      || this.config.provider.subscriptionId
      || this.serverless.variables[constants.variableKeys.subscriptionId]
  }

  /**
   * Name of current deployment
   */
  public getDeploymentName(): string {
    return AzureNamingService.getDeploymentName(
      this.config,
      (this.config.provider.deployment.rollback) ? `t${this.getTimestamp()}` : null
    )
  }

  public getDeploymentConfig(): DeploymentConfig {
    return this.config.provider.deployment;
  }

  /**
   * Get rollback-configured artifact name. Contains `-t{timestamp}`
   * Takes name of deployment and replaces `rg-deployment` or `deployment` with `artifact`
   */
  public getArtifactName(deploymentName?: string): string {
    deploymentName = deploymentName || this.getDeploymentName();
    const { deployment, artifact } = constants.naming.suffix;
    return `${deploymentName
      .replace(`rg-${deployment}`, artifact)
      .replace(deployment, artifact)}.zip`
  }

  /**
   * Function configuration from serverless.yml
   */
  public getFunctionConfig(): { [functionName: string]: ServerlessAzureFunctionConfig } {
    return this.config.functions;
  }

  /**
   * Name of file containing serverless config
   */
  public getConfigFile(): string {
    return this.getOption("config", "serverless.yml");
  }

  /**
   * Name of Function App Service
   */
  public getServiceName(): string {
    return this.config.service;
  }

  /**
   * Operating system for function app
   */
  public getOs(): FunctionAppOS {
    return this.config.provider.os;
  }

  /**
   * Function app configured to run on Python
   */
  public isPythonTarget(): boolean {
    return isPythonRuntime(this.config.provider.runtime);
  }

  /**
   * Function app configured to run on Node
   */
  public isNodeTarget(): boolean {
    return isNodeRuntime(this.config.provider.runtime);
  }

  /**
   * Function app configured to run on Linux
   */
  public isLinuxTarget(): boolean {
    return this.getOs() === FunctionAppOS.LINUX
  }

  public getCommand(key: string): CliCommand {
    return this.cliCommandFactory.getCommand(key);
  }

  public getCompilerCommand(runtime: Runtime, mode: BuildMode): CliCommand {
    return this.cliCommandFactory.getCommand(`${runtime}-${mode}`);
  }

  public shouldCompileBeforePublish(): boolean {
    return isCompiledRuntime(this.config.provider.runtime) && this.config.provider.os === FunctionAppOS.WINDOWS;
  }

  /**
   * Set any default values required for service
   * @param config Current Serverless configuration
   */
  private setDefaultValues(config: ServerlessAzureConfig) {
    const { awsRegion, region, stage, prefix, os } = constants.defaults;
    const providerRegion = config.provider.region;

    if (!providerRegion || providerRegion === awsRegion) {
      config.provider.region = this.serverless.service.provider["location"] || region;
    }
    if (!config.provider.stage) {
      config.provider.stage = stage;
    }

    if (!config.provider.prefix) {
      config.provider.prefix = prefix;
    }

    if (!config.provider.os) {
      config.provider.os = os;
    }
    
    if (!config.provider.type) {
      config.provider.type = "consumption"
    }
  }

  /**
   * Overwrite values for resourceGroup, prefix, region and stage
   * in config if passed through CLI
   */
  private initializeConfig(service: Service): ServerlessAzureConfig {
    const config: ServerlessAzureConfig = service as any;
    const providerConfig = Utils.get(this.serverless.variables, constants.variableKeys.providerConfig);
    if (providerConfig) {
      config.provider = providerConfig;
      return config;
    }
    this.serverless.cli.log("Initializing provider configuration...");
    this.setDefaultValues(config);

    const {
      prefix,
      region,
      stage,
      subscriptionId,
      tenantId,
      appId,
      deployment,
      runtime,
      os
    } = config.provider;

    const options: AzureNamingServiceOptions = {
      config: config,
      suffix: `${config.service}-rg`,
      includeHash: false,
    }

    config.provider = {
      ...config.provider,
      prefix: this.getOption("prefix") || prefix,
      stage: this.getOption("stage") || stage,
      region: this.getOption("region") || region,
      subscriptionId: this.getOption(constants.variableKeys.subscriptionId)
        || process.env.AZURE_SUBSCRIPTION_ID
        || subscriptionId
        || this.serverless.variables[constants.variableKeys.subscriptionId],
      tenantId: this.getOption(constants.variableKeys.tenantId)
        || process.env.AZURE_TENANT_ID
        || tenantId,
      appId: this.getOption(constants.variableKeys.appId)
        || process.env.AZURE_CLIENT_ID
        || appId,
    }
    config.provider.resourceGroup = (
      this.getOption("resourceGroup", config.provider.resourceGroup)
    ) || AzureNamingService.getResourceName(options);

    if (!runtime) {
      throw new Error(`Runtime undefined. Runtimes supported: ${supportedRuntimes.join(",")}`);
    }

    if (!supportedRuntimeSet.has(runtime)) {
      throw new Error(`Runtime ${runtime} is not supported. Runtimes supported: ${supportedRuntimes.join(",")}`)
    }

    if (isPythonRuntime(runtime) && os !== FunctionAppOS.LINUX) {
      this.serverless.cli.log("Python functions can ONLY run on Linux Function Apps.");
      config.provider.os = FunctionAppOS.LINUX;
    }

    config.provider.deployment = {
      ...constants.deploymentConfig,
      ...deployment,
    }

    this.serverless.variables[constants.variableKeys.providerConfig] = config.provider;
    return config;
  }

  /**
   * Get timestamp from `packageTimestamp` serverless variable
   * If not set, create timestamp, set variable and return timestamp
   */
  private getTimestamp(): number {
    const key = constants.variableKeys.packageTimestamp
    let timestamp = +this.getVariable(key);
    if (!timestamp) {
      timestamp = Date.now();
      this.serverless.variables[key] = timestamp;
    }
    return timestamp;
  }

  /**
   * Get value of option from Serverless CLI
   * @param key Key of option
   * @param defaultValue Default value if key not found in options object
   */
  protected getOption(key: string, defaultValue?: any) {
    return Utils.get(this.options, key, defaultValue);
  }

  /**
   * Get variable value from Serverless variables
   * @param key Key for variable
   * @param defaultValue Default value if key not found in variable object
   */
  protected getVariable(key: string, defaultValue?: any) {
    return Utils.get(this.serverless.variables, key, defaultValue);
  }

  private registerCliCommands() {
    // for (const key of Object.keys(cliCommands)) {
    //   this.cliCommandFactory.registerCommand(key, this.cliCommandFactory.registerCommand(key]);
    // }
    this.cliCommandFactory.registerCommand(constants.cliCommandKeys.start, {
      command: "func",
      args: [ "host", "start" ],
    });

    this.cliCommandFactory.registerCommand(`${Runtime.DOTNET22}-${BuildMode.RELEASE}`, {
      command: "dotnet",
      args: [
        "build",
        "--configuration",
        "release",
        "--framework",
        "netcoreapp2.2",
        "--output",
        constants.tmpBuildDir
      ],
    });
    
    this.cliCommandFactory.registerCommand(`${Runtime.DOTNET22}-${BuildMode.DEBUG}`, {
      command: "dotnet",
      args: [
        "build",
        "--configuration",
        "debug",
        "--framework",
        "netcoreapp2.2",
        "--output",
        constants.tmpBuildDir
      ],
    });
    
    this.cliCommandFactory.registerCommand(`${Runtime.DOTNET31}-${BuildMode.RELEASE}`, {
      command: "dotnet",
      args: [
        "build",
        "--configuration",
        "release",
        "--framework",
        "netcoreapp3.1",
        "--output",
        constants.tmpBuildDir
      ],
    });
    
    this.cliCommandFactory.registerCommand(`${Runtime.DOTNET31}-${BuildMode.DEBUG}`, {
      command: "dotnet",
      args: [
        "build",
        "--configuration",
        "debug",
        "--framework",
        "netcoreapp3.1",
        "--output",
        constants.tmpBuildDir
      ],
    });
    
    this.cliCommandFactory.registerCommand(`${Runtime.DOTNET60}-${BuildMode.RELEASE}`, {
      command: "dotnet",
      args: [
        "build",
        "--configuration",
        "release",
        "--framework",
        "net6.0",
        "--output",
        constants.tmpBuildDir
      ],
    });
    
    this.cliCommandFactory.registerCommand(`${Runtime.DOTNET60}-${BuildMode.DEBUG}`, {
      command: "dotnet",
      args: [
        "build",
        "--configuration",
        "debug",
        "--framework",
        "net6.0",
        "--output",
        constants.tmpBuildDir
      ],
    });
  }
}
