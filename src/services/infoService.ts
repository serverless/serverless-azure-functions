import Serverless from "serverless";
import { FunctionAppResource } from "../armTemplates/resources/functionApp";
import { ArmParameters } from "../models/armTemplates";
import { AzureResourceInfo, ServiceInfo } from "../models/serverless";
import { ArmService } from "./armService";
import { BaseService } from "./baseService";
import { FunctionAppService } from "./functionAppService";
import { ResourceService } from "./resourceService";

/**
 * Type of information to be presented
 */
export enum ServiceInfoType {
  /** Information on hypothetical deployment */
  DRYRUN,
  /** Information reflecting currently deployed resources in resource group */
  DEPLOYED
}

/**
 * Service to collect and present information about the serverless service
 */
export class AzureInfoService extends BaseService {
  
  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
  }

  /**
   * Prints information relating to the configuration and infrastructure
   * of the service. By default, prints a basic summary. If the "-v" or "--verbose"
   * flag is added, it prints the entire ARM template and parameters
   * @param infoType Type of information to print.
   * DRYRUN uses the information that will be configured by the plugin
   * DEPLOYED uses the information from the actual deployed services in Azure
   */
  public async printInfo(infoType: ServiceInfoType = ServiceInfoType.DRYRUN): Promise<void> {
    const info = await this.getInfo(infoType);
    if ("arm" in this.options) {
      this.prettyPrint(info.deployment);
      return;
    }
    this.printSummary(info);
  }

  /**
   * Gets the data structure that summarizes the configuration and infrastructure
   * of the service.
   * @param infoType Type of information to print.
   * DRYRUN uses the information that will be configured by the plugin
   * DEPLOYED uses the information from the actual deployed services in Azure
   */
  public async getInfo(infoType: ServiceInfoType = ServiceInfoType.DRYRUN): Promise<ServiceInfo> {
    return (infoType === ServiceInfoType.DRYRUN) ? await this.getDryRun() : await this.getDeployed();
  }

  private async getDeployed(): Promise<ServiceInfo> {
    const resourceService = new ResourceService(this.serverless, this.options);
    const resourceGroup = await resourceService.getResourceGroup();
    if (!resourceGroup) {
      this.log(`Resource group ${this.resourceGroup} is not yet deployed`);
      return;
    }
    const resources = await resourceService.getResources();
    if (!resources.length) {
      this.log(`Resource group ${this.resourceGroup} has no resources`);
      return;
    }

    const functionAppService = new FunctionAppService(this.serverless, this.options);
    const functionApp = await functionAppService.get();
    const functions = await functionAppService.listFunctions(functionApp);

    return {
      resourceGroup: this.resourceGroup,
      isDryRun: false,
      resources: resources.map((r) => {
        const info: AzureResourceInfo = {
          name: r.name,
          resourceType: r.type,
          region: r.location
        }
        return info;
      }),
      functionApp: {
        name: functionApp.name,
        functions: functions.map((f) => f.name),
      },
      deployment: await resourceService.getPreviousDeploymentTemplate()
    }
  }

  /**
   * Prints the service info in a summarized, readable manner
   * @param serviceInfo Data structure describing service
   */
  private async printSummary(serviceInfo: ServiceInfo) {
    if (!serviceInfo) {
      return;
    }
    const printVersion = [
      `\nResource Group Name: ${serviceInfo.resourceGroup}`,
      `Function App Name: ${serviceInfo.functionApp.name}`,
      "Functions:",
      "\t" + serviceInfo.functionApp.functions.map((f) => `${f}`).join("\n\t"),
      "Azure Resources:",
      serviceInfo.resources.map((r) => this.stringify(r)).join(",\n")
    ].join("\n");
    this.log(printVersion);
  }

  /**
   * Create the dry-run data structure. Assembles the `ServiceInfo` based on what
   * would be deployed if it were run. Collects names of Azure resources from generated
   * ARM template and replaces the parameter stubs with the actual name
   */
  private async getDryRun(): Promise<ServiceInfo> {
    const armService = new ArmService(this.serverless, this.options);
    const { parameters, template } = await armService.createDeploymentFromType(this.config.provider.type);
    const resources: AzureResourceInfo[] = template.resources.map((resource) => {
      const info: AzureResourceInfo = {
        name: this.parametersValueReplace(resource.name, parameters),
        resourceType: resource.type,
        region: this.parametersValueReplace(resource.location, parameters),
      }
      return info;
    });

    return {
      resourceGroup: this.configService.getResourceGroupName(),
      isDryRun: true,
      resources,
      functionApp: {
        name: FunctionAppResource.getResourceName(this.config),
        functions: Object.keys(this.configService.getFunctionConfig()),
      },
      deployment: {
        parameters,
        template
      }
    };
  }

  /**
   * Returns the name that will be used by the ARM template. If it is a parameterized name, it will
   * return the correct replacement value. If not, it will return the original value
   * @param original Parameter stub or original value. Should be something like `[parameters('myParamName')]`
   * @param parameters Object containing parameter values (e.g. { myParamName: 'ThisIsMyParamName' })
   */
  private parametersValueReplace(original: string, parameters: ArmParameters): string {
    const match = original.match(/\[parameters\('(.*)'\)\]/i);
    if (!match || match.length < 2) {
      return original;
    }
    const key = match[1];
    const { defaultValue, value } = parameters[key];
    return (value ? value : defaultValue) as string;
  }
}
