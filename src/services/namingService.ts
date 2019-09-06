import { ServerlessAzureConfig, ResourceConfig } from "../models/serverless"
import { Guard } from "../shared/guard"
import configConstants from "../config";
import md5 from "md5";

export interface AzureNamingServiceOptions {
  config: ServerlessAzureConfig;
  resourceConfig?: ResourceConfig;
  suffix?: string;
  includeHash?: boolean;
}

export class AzureNamingService {

  /**
   * Get a resource name for an Azure Service. Naming convention:
   *
   * {prefix}-{shortRegionName}-{shortStageName}(optionally: -{suffix})
   *
   * @param config Serverless Azure Config for service (serverless.service)
   * @param resourceConfig The serverless resource configuration
   * @param suffix Optional suffix to append on the end of the generated name
   */
  public static getResourceName(options: AzureNamingServiceOptions) {
    if (options.resourceConfig && options.resourceConfig.name) {
      return options.resourceConfig.name;
    }

    if (options.includeHash === undefined) {
      options.includeHash = true;
    }

    const { prefix, region, stage } = options.config.provider
    let name = [
      prefix,
      this.createShortAzureRegionName(region),
      this.createShortStageName(stage),
    ].join("-");

    if(options.includeHash) {
      name += `-${md5(options.config.provider.resourceGroup).substr(0, configConstants.resourceGroupHashLength)}`
    }

    if (options.suffix) {
      name += `-${options.suffix}`;
    }

    return name.toLowerCase();
  }

  /**
   * Get a name for an Azure resource that is shorter than a max length and has no forbidden characters
   * Naming convention:
   *
   * {safePrefix}{safeRegion}{safeStage}{safeServiceNameHash}
   *
   * @param config Serverless Azure Config for service (serverless.service)
   * @param maxLength Maximum length of name for resource
   * @param resourceConfig The serverless resource configuration
   * @param suffix Optional suffix to append on the end of the generated name
   * @param forbidden Regex for characters to remove from name. Defaults to non-alpha-numerics
   * @param replaceWith String to replace forbidden characters. Defaults to empty string
   */
  public static getSafeResourceName(options: AzureNamingServiceOptions, maxLength: number) {
    const nonAlphaNumeric = /\W+/g;

    if (options.resourceConfig && options.resourceConfig.name) {
      const { name } = options.resourceConfig;

      if (name.length > maxLength) {
        throw new Error(`Name '${name}' invalid. Should be shorter than ${maxLength} characters`);
      }

      return name.replace(nonAlphaNumeric, "");
    }

    if (options.includeHash === undefined) {
      options.includeHash = true;
    }

    const { prefix, region, stage } = options.config.provider;

    let safePrefix = prefix.replace(nonAlphaNumeric, "");
    const safeRegion = this.createShortAzureRegionName(region);
    let safeStage = this.createShortStageName(stage);
    let safeSuffix = options.suffix.replace(nonAlphaNumeric, "");

    const hashLength = (options.includeHash) ? configConstants.resourceGroupHashLength : 0;
    const remaining = maxLength - (safePrefix.length + safeRegion.length + safeStage.length + safeSuffix.length + hashLength);

    // Dynamically adjust the substring based on space needed
    if (remaining < 0) {
      let partLength = Math.floor(Math.abs(remaining) / 4);
      if (partLength < 3) {
        partLength = 3;
      }

      safePrefix = safePrefix.substr(0, partLength);
      safeStage = safeStage.substr(0, partLength);
      safeSuffix = safeSuffix.substr(0, partLength);
    }

    const safeHash = md5(options.config.provider.resourceGroup).substr(0, hashLength);

    const name = [safePrefix, safeRegion, safeStage, safeHash, safeSuffix]
      .join("")
      .toLowerCase();

    if (name.length > maxLength) {
      throw new Error(`Name ${name} is too long. Should be shorter than ${maxLength} characters`)
    }

    return name;
  }

  /**
   * Creates a deployment name from the serverless configuration
   * @param config The serverless azure config
   * @param timestamp The timestamp of the deployment
   */
  public static getDeploymentName(config: ServerlessAzureConfig, timestamp?: string) {
    let maxLength = configConstants.naming.maxLength.deploymentName;
    const suffix = configConstants.naming.suffix.deployment;

    const { deploymentName } = config.provider

    if (timestamp) {
      maxLength -= timestamp.length + suffix.length;

      const options: AzureNamingServiceOptions = {
        config,
        suffix: config.service,
        includeHash: false,
      }

      const name = (deploymentName)
        ? deploymentName.substr(0, maxLength)
        : [AzureNamingService.getSafeResourceName(options, maxLength), suffix].join("-");

      return [name, timestamp].join("-");
    }

    return deploymentName.substr(0, maxLength);
  }

  /**
   * Creates a short name to be used for state name abbreviation
   * @param stageName The stage name
   */
  public static createShortStageName(stageName: string) {
    Guard.empty(stageName, "stageName");

    const stageMap = {
      "dogfood": "df",
      "production": "prod",
      "prod": "prod",
      "development": "dev",
      "testing": "test",
      "test": "test"
    };

    return this.createShortName(stageName, stageMap);
  }

  /**
   * Gets the normalized region name from long name (ex. West US 2 -> westus2)
   * @param regionName The region name
   */
  public static getNormalizedRegionName(regionName: string) {
    Guard.empty(regionName, "regionName");
    return regionName.replace(/\W/g, "").toLowerCase();
  }

  /**
   * Creates a short name for an azure region
   * @param regionName The azure region name
   */
  public static createShortAzureRegionName(regionName: string) {
    Guard.empty(regionName, "regionName");

    const locationMap = {
      "north": "n",
      "south": "s",
      "east": "e",
      "west": "w",
      "central": "c",
    };

    return this.createShortName(regionName, locationMap);
  }

  /**
   * Creates a short name from a long name based on a well-known string map
   * @param longName The long name to replace
   * @param wellKnownMap A well known map of long terms to short abbreviations
   */
  private static createShortName(longName: string, wellKnownMap: { [key: string]: string }) {
    Guard.empty(longName);
    Guard.null(wellKnownMap);

    const pattern = `(${Object.keys(wellKnownMap).join("|")})`;
    const regex = new RegExp(pattern, "g");

    return longName
      .replace(/\W+/g, "")
      .toLowerCase()
      .split(regex)
      .map((part) => {
        return wellKnownMap[part] || part.substr(0, 3);
      })
      .join("");
  }
}
