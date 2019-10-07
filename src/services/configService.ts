import semver from "semver";
import Serverless from "serverless";
import Service from "serverless/classes/Service";
import configConstants from "../config";
import { DeploymentConfig, FunctionRuntime, ServerlessAzureConfig, 
  ServerlessAzureFunctionConfig, SupportedRuntimeLanguage, FunctionAppOS } from "../models/serverless";
import { constants } from "../shared/constants";
import { Guard } from "../shared/guard";
import { Utils } from "../shared/utils";
import { AzureNamingService, AzureNamingServiceOptions } from "./namingService";
import runtimeVersionsJson from "./runtimeVersions.json";

/**
 * Handles all Service Configuration
 */
export class ConfigService {

  /** Configuration for service */
  private config: ServerlessAzureConfig;

  public constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.config = this.initializeConfig(serverless.service);
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
    return this.config.provider.subscriptionId;
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
    const { deployment, artifact } = configConstants.naming.suffix;
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
   * Function runtime configuration
   */
  public getRuntime(): FunctionRuntime {
    return this.config.provider.functionRuntime;
  }

  /**
   * Operating system for function app
   */
  public getOs(): FunctionAppOS {
    return this.config.provider.os;
  }

  /**
   * Set any default values required for service
   * @param config Current Serverless configuration
   */
  private setDefaultValues(config: ServerlessAzureConfig) {
    const { awsRegion, region, stage, prefix, os } = configConstants.defaults;
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
  }

  /**
   * Overwrite values for resourceGroup, prefix, region and stage
   * in config if passed through CLI
   */
  private initializeConfig(service: Service): ServerlessAzureConfig {
    const config: ServerlessAzureConfig = service as any;
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
    
    const functionRuntime = this.getFunctionRuntime(runtime);
    if (functionRuntime.language === SupportedRuntimeLanguage.PYTHON) {
      config.provider.os = FunctionAppOS.LINUX;
    } 

    config.provider.functionRuntime = functionRuntime;

    config.provider.deployment = {
      ...configConstants.deploymentConfig,
      ...deployment,
      external: (os === FunctionAppOS.LINUX),
    }

    return config;
  }

  private getFunctionRuntime(runtime: string): FunctionRuntime {
    Guard.null(runtime, "runtime", "Runtime version not specified in serverless.yml");

    const versionMatch = runtime.match(/([0-9]+\.)+[0-9]*x?/);
    const languageMatch = runtime.match(/nodejs|python/);

    let versionInput: string;
    let languageInput: string;

    // Extract version and language input
    if (versionMatch && languageMatch) {
      versionInput = versionMatch[0];
      languageInput = languageMatch[0];
    } else {
      throw new Error(`Invalid runtime: ${runtime}. ${this.getRuntimeErrorMessage(null)}`);
    }

    const targetedVersionRegex = new RegExp(
      `^${versionInput}`
        .replace(".", "\.")
        .replace("x", "[0-9]+"),
    );

    const matchingVersions: string[] = runtimeVersionsJson[languageInput]
      .filter((item) => item.version.match(targetedVersionRegex))
      .map((item) => item.version);

    if (!matchingVersions.length) {
      throw new Error(`Runtime ${runtime} is not supported. ${this.getRuntimeErrorMessage(null)}`);
    }

    const version = matchingVersions.sort(semver.rcompare)[0];

    const language: SupportedRuntimeLanguage = {
      "nodejs": SupportedRuntimeLanguage.NODE,
      "python": SupportedRuntimeLanguage.PYTHON
    }[languageInput];
    
    return {
      language,
      version
    }
  }

  private getRuntimeErrorMessage(language: SupportedRuntimeLanguage) {
    if (language) {
      return `Supported versions for ${language} are: ${
        runtimeVersionsJson[language]
          .map((item) => item.version)
          .join(",")}`
    }
    return `Supported versions: ${JSON.stringify(runtimeVersionsJson, null, 2)}`
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
}
