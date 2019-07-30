import md5 from "md5";
import Serverless from "serverless";
import configConstants from "../config";
import { ArmResourceType } from "../models/armTemplates";
import { DeploymentConfig, ServerlessAzureConfig, ServerlessAzureOptions } from "../models/serverless";
import { Utils } from "../shared/utils";

export class AzureNamingService {

  private config: ServerlessAzureConfig;
  private nonAlphaNumerics = /[-!$%^&*()_+|~=`{}\[\]:";'<>?,.\/\W]/

  public constructor(
    private serverless: Serverless,
    private options: ServerlessAzureOptions = { stage: null, region: null }
  ) {
    this.setDefaultValues();
    this.config = serverless.service as any;
  }

  /**
   * Name of Function App Service
   */
  public getServiceName(): string {
    return this.config.service;
  }

  /**
   * Name of Azure Region for deployment
   */
  public getRegion(): string {
    return this.options.region || this.config.provider.region;
  }

  /**
   * Name of current deployment stage
   */
  public getStage(): string {
    return this.options.stage || this.config.provider.stage;
  }

  /**
   * Name of prefix for service
   */
  public getPrefix(): string {
    return this.config.provider.prefix;
  }

  /**
   * Name of current resource group
   */
  public getResourceGroupName(): string {
    const regionName = Utils.createShortAzureRegionName(this.getRegion());
    const stageName = Utils.createShortStageName(this.getStage());

    return this.options.resourceGroup
      || this.config.provider.resourceGroup
      || `${this.getPrefix()}-${regionName}-${stageName}-${this.getServiceName()}-rg`;
  }

  /**
   * Name of current ARM deployment
   */
  public getDeploymentName(): string {
    const timestampString = `t${this.getTimestamp()}`

    const { deploymentName } = this.config.provider;
    if (deploymentName) {
      return `${deploymentName}-${timestampString}`;
    }

    const maxLength = configConstants.nameMaxLengths.deployment;
    const suffix = "deployment";

    const nameArray = (this.getDeploymentConfig().rollback)
      ?
      [
        this.generateSafeName(maxLength - timestampString.length - suffix.length - 2, "-"),
        suffix,
        timestampString
      ]
      :
      [
        this.generateSafeName(maxLength - suffix.length - 1, "-"),
        suffix
      ]
    return nameArray.join("-");
  }

  /**
   * Name of artifact uploaded to blob storage
   */
  public getArtifactName(deploymentName: string): string {
    return `${deploymentName
      .replace("rg-deployment", "artifact")
      .replace("deployment", "artifact")}.zip`;
  }

  /**
   * Get name of Azure resource. If name for resource is not
   * specified in the serverless configuration, the name will be
   * generated with the service prefix, region, stage and a
   * suffix specific to the service
   * @param resource ARM Resource to name
   */
  public getResourceName(resource: ArmResourceType): string {
    switch (resource) {
      case ArmResourceType.Apim:
        return this.getApimName();
      case ArmResourceType.AppInsights:
        return this.getAppInsightsName();
      case ArmResourceType.AppServicePlan:
        return this.getAppServicePlanName();
      case ArmResourceType.FunctionApp:
        return this.getFunctionAppName();
      case ArmResourceType.HostingEnvironment:
        return this.getHostingEnvironmentName();
      case ArmResourceType.StorageAccount:
        return this.getStorageAccountName();
      case ArmResourceType.VirtualNetwork:
        return this.getVirtualNetworkName();
      default:
        throw new Error(`No naming convention for resource type: ${resource}`)
    }
  }

  /**
   * Configured or generated APIM name
   */
  private getApimName(): string {
    return this.getConfiguredName(this.config.provider.apim, "apim");
  }

  /**
   * Configured or generated App Insights name
   */
  private getAppInsightsName(): string {
    return this.getConfiguredName(this.config.provider.appInsights, "appinsights");
  }

  /**
   * Configured or generated App Service Plan name
   */
  private getAppServicePlanName(): string {
    return this.getConfiguredName(this.config.provider.appServicePlan, "asp");
  }

  /**
   * Configured or generated Function App Name
   */
  private getFunctionAppName(): string {
    const safeServiceName = this.config.service.replace(/\s/g, "-");
    return this.getConfiguredName(this.config.provider.functionApp, safeServiceName);
  }

  /**
   * Configured or generated Hosting Environment Name
   */
  private getHostingEnvironmentName(): string {
    return this.getConfiguredName(this.config.provider.hostingEnvironment, "ase");
  }

  /**
   * Configured or generated Storage Account Name
   */
  private getStorageAccountName(): string {
    return this.config.provider.storageAccount && this.config.provider.storageAccount.name
      ? this.config.provider.storageAccount.name
      : this.generateSafeName(configConstants.nameMaxLengths.storageAccount, "", this.nonAlphaNumerics)
  }

  /**
   * Configured or generated Virtual Network Name
   */
  private getVirtualNetworkName(): string {
    return this.getConfiguredName(this.config.provider.virtualNetwork, "vnet");
  }

  /**
   * Generates name based on options from provider config.
   * Naming convention:
   *
   * {prefix}-{shortRegion}-{shortStage}-{suffix}
   *
   * @param resource Azure resource specified in provider config
   * @param suffix Append to end of configured name
   */
  private getConfiguredName(resource: { name?: string }, suffix: string) {
    const { prefix, region, stage } = this.config.provider;
    return resource && resource.name
      ? resource.name
      : [
        prefix,
        Utils.createShortAzureRegionName(region),
        Utils.createShortStageName(stage),
        suffix
      ].join("-");
  }

  /**
   * Generates a safe name for an Azure resource
   * Naming convention:
   *
   * {safePrefix}{delimiter}{safeRegion}{delimiter}{safeStage}{delimiter}{safeNameHash}
   *
   * @param maxLength Maximum length of name
   * @param delimiter String in between prefix, region, stage and name hash. Defaults to empty string
   * @param remove Regex of characters to remove from name. Defaults to whitespace
   */
  private generateSafeName(maxLength: number, delimiter = "", remove = /\W+/g) {
    const nameHash = md5(this.config.service);

    // Account for delimiters in between prefix, region, stage and safe name hash, 3 total
    maxLength = maxLength - (delimiter.length * 3);

    const { prefix, region, stage } = this.config.provider;

    let safePrefix = prefix.replace(remove, "");
    const safeRegion = Utils.createShortAzureRegionName(region);
    let safeStage = Utils.createShortStageName(stage);
    let safeNameHash = nameHash.substr(0, 6);

    const remaining = maxLength - (safePrefix.length + safeRegion.length + safeStage.length + safeNameHash.length);

    // Dynamically adjust the substring based on space needed
    if (remaining < 0) {
      const partLength = Math.floor(Math.abs(remaining) / 3);
      safePrefix = safePrefix.substr(0, partLength);
      safeStage = safeStage.substr(0, partLength);
      safeNameHash = safeNameHash.substr(0, partLength);
    }

    return [safePrefix, safeRegion, safeStage, safeNameHash]
      .join(delimiter)
      .toLocaleLowerCase();
  }

  /**
   * Get timestamp from `packageTimestamp` serverless variable
   * If not set, create timestamp, set variable and return timestamp
   */
  private getTimestamp(): number {
    let timestamp = +this.serverless.variables["packageTimestamp"];
    if (!timestamp) {
      timestamp = Date.now();
      this.serverless.variables["packageTimestamp"] = timestamp;
    }
    return timestamp;
  }

  /**
   * Deployment this.config from `serverless.yml` or default.
   * Defaults can be found in the `config.ts` file
   */
  private getDeploymentConfig(): DeploymentConfig {
    const providedConfig = this.serverless["deploy"] as DeploymentConfig;
    return {
      ...configConstants.deploymentConfig,
      ...providedConfig,
    }
  }


  private setDefaultValues(): void {
    // TODO: Right now the serverless core will always default to AWS default region if the
    // region has not been set in the serverless.yml or CLI options
    const awsDefault = "us-east-1";
    const providerRegion = this.serverless.service.provider.region;

    if (!providerRegion || providerRegion === awsDefault) {
      // no region specified in serverless.yml
      this.serverless.service.provider.region = "westus";
    }

    if (!this.serverless.service.provider.stage) {
      this.serverless.service.provider.stage = "dev";
    }

    if (!this.serverless.service.provider["prefix"]) {
      this.serverless.service.provider["prefix"] = "sls";
    }
  }
}
