import Serverless from "serverless";
import Service from "serverless/classes/Service";
import configConstants from "../config";
import { ServerlessAzureConfig, ServerlessAzureFunctionConfig } from "../models/serverless";
import { constants } from "../shared/constants";
import { Utils } from "../shared/utils";
import { AzureNamingService, AzureNamingServiceOptions } from "./namingService";

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
   * Set any default values required for service
   * @param config Current Serverless configuration
   */
  private setDefaultValues(config: ServerlessAzureConfig) {
    const { awsRegion, region, stage, prefix } = configConstants.defaults;
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
      deployment
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
        || appId
    }
    config.provider.resourceGroup = (
      this.getOption("resourceGroup", config.provider.resourceGroup)
    ) || AzureNamingService.getResourceName(options);

    config.provider.deployment = {
      ...configConstants.deploymentConfig,
      ...deployment
    }

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
}
