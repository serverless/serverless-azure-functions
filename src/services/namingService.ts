import { ServerlessAzureConfig, ResourceConfig } from "../models/serverless"
import { Guard } from "../shared/guard"
import md5 from "md5";
import configConstants from "../config";

export class AzureNamingService {

  /**
   * Get a resource name for an Azure Service. Naming convention:
   *
   * {prefix}-{shortRegionName}-{shortStageName}(optionally: -{suffix})
   *
   * @param config Serverless Azure Config for service (serverless.service)
   * @param resourceConfig
   * @param suffix
   */
  public static getResourceName(config: ServerlessAzureConfig, resourceConfig?: ResourceConfig, suffix?: string) {
    if (resourceConfig && resourceConfig.name) {
      return resourceConfig.name;
    }
    const { prefix, region, stage } = config.provider
    let name = [
      prefix,
      this.createShortAzureRegionName(region),
      this.createShortStageName(stage),
    ].join("-");
    if (suffix) {
      name += `-${suffix}`;
    }
    return name;
  }

  /**
   * Get a name for an Azure resource that is shorter than a max length and has no forbidden characters
   * Naming convention:
   *
   * {safePrefix}{safeRegion}{safeStage}{safeServiceNameHash}
   *
   * @param config Serverless Azure Config for service (serverless.service)
   * @param maxLength Maximum length of name for resource
   * @param resourceConfig Configuration for resource from serverless configuration
   * @param forbidden Regex for characters to remove from name. Defaults to non-alpha-numerics
   * @param replaceWith String to replace forbidden characters. Defaults to empty string
   */
  public static getSafeResourceName(config: ServerlessAzureConfig, maxLength: number, resourceConfig?: ResourceConfig, forbidden = /\W+/g, replaceWith = "") {
    if (resourceConfig && resourceConfig.name) {
      const { name } = resourceConfig;
      if (name.length > maxLength) {
        throw new Error(`Name '${name}' invalid. Should be shorter than ${maxLength} characters`);
      }
      return name.replace(forbidden, replaceWith);
    }

    const { prefix, region, stage } = config.provider;

    const nameHash = md5(config.service);

    let safePrefix = prefix.replace(forbidden, replaceWith);
    const safeRegion = this.createShortAzureRegionName(region);
    let safeStage = this.createShortStageName(stage);
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
      .join("")
      .toLocaleLowerCase();
  }

  public static getDeploymentName(config: ServerlessAzureConfig, timestamp?: string) {
    let maxLength = configConstants.naming.maxLength.deploymentName;
    const suffix = configConstants.naming.suffix.deployment;

    const { deploymentName } = config.provider

    if (timestamp) {
      maxLength -= timestamp.length + suffix.length;;

      const name = (deploymentName) ? deploymentName.substr(0, maxLength)
        : [ AzureNamingService.getSafeResourceName(config, maxLength), suffix ].join("-");
      return [ name, timestamp ].join("-");
    }

    return deploymentName.substr(0, maxLength);
  }

  /**
   * Creates a short name to be used for state name abbreviation
   * @param stageName The stage name
   */
  public static createShortStageName(stageName: string) {
    Guard.empty(stageName);

    const stageMap = {
      "dogfood": "df",
      "production": "prod",
      "development": "dev",
      "testing": "test"
    };

    return this.createShortName(stageName, stageMap);
  }

  /**
   * Gets the normalized region name from long name (ex. West US 2 -> westus2)
   * @param regionName The region name
   */
  public static getNormalizedRegionName(regionName: string) {
    Guard.empty(regionName);
    return regionName.replace(/\W/g, "").toLowerCase();
  }

  /**
   * Creates a short name for an azure region
   * @param regionName The azure region name
   */
  public static createShortAzureRegionName(regionName: string) {
    Guard.empty(regionName);

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
