import { ResourceManagementClient } from "@azure/arm-resources";
import { Deployment, DeploymentExtended } from "@azure/arm-resources/esm/models";
import deepEqual from "deep-equal";
import fs from "fs";
import jsonpath from "jsonpath";
import path from "path";
import Serverless from "serverless";
import { ArmDeployment, ArmParameters, ArmResourceTemplate, ArmResourceTemplateGenerator, ArmTemplateType } from "../models/armTemplates";
import { DeploymentExtendedError } from "../models/azureProvider";
import { ArmTemplateConfig, ServerlessAzureOptions } from "../models/serverless";
import { Guard } from "../shared/guard";
import { BaseService } from "./baseService";
import { ResourceService } from "./resourceService";

export class ArmService extends BaseService {
  private resourceClient: ResourceManagementClient;

  public constructor(serverless: Serverless, options: ServerlessAzureOptions) {
    super(serverless, options);
    this.resourceClient = new ResourceManagementClient(this.credentials, this.subscriptionId);
  }

  /**
   * Creates an ARM deployment from a well-known configuration (consumption, premium, ase)
   * @param type The well-known template type
   */
  public async createDeploymentFromType(type: ArmTemplateType | string): Promise<ArmDeployment> {
    Guard.empty(type);

    this.log(`-> Creating ARM template from type: ${type}`);

    const { ApimResource } = await import("../armTemplates/resources/apim");
    const apimResource = new ApimResource();
    let template: ArmResourceTemplateGenerator;

    try {
      template = (await import(`../armTemplates/${type}`)).default;
    } catch (e) {
      throw new Error(`Unable to find template with name ${type} `);
    }

    const mergedTemplate = template.getTemplate();
    let parameters = template.getParameters(this.config);

    if (this.config.provider.apim) {
      const apimTemplate = apimResource.getTemplate();
      const apimParameters = apimResource.getParameters(this.config);

      mergedTemplate.parameters = {
        ...mergedTemplate.parameters,
        ...apimTemplate.parameters,
      };
      mergedTemplate.resources = [
        ...mergedTemplate.resources,
        ...apimTemplate.resources,
      ];

      parameters = {
        ...parameters,
        ...apimParameters,
      };
    }

    return {
      template: mergedTemplate,
      parameters,
    };
  }

  /**
   * Creates an ARM deployment from the serverless custom yaml configuration
   * @param armTemplateConfig The serverless yaml ARM template configuration
   */
  public createDeploymentFromConfig(armTemplateConfig: ArmTemplateConfig): Promise<ArmDeployment> {
    Guard.null(armTemplateConfig);

    this.log(`-> Creating ARM template from file: ${armTemplateConfig.file}`);
    const templateFilePath = path.join(this.serverless.config.servicePath, armTemplateConfig.file);
    const template = JSON.parse(fs.readFileSync(templateFilePath, "utf8"));

    return Promise.resolve({
      template,
      parameters: armTemplateConfig.parameters
    });
  }

  /**
   * Deploys the specified ARM template to Azure via REST service call
   * @param deployment The ARM template to deploy
   */
  public async deployTemplate(deployment: ArmDeployment): Promise<DeploymentExtended> {
    Guard.null(deployment);

    this.applyEnvironmentVariables(deployment);

    const resourceService = new ResourceService(this.serverless, this.options);
    const previous = await resourceService.getPreviousDeploymentTemplate();

    if (this.areDeploymentsEqual(deployment, previous)) {
      this.log("Generated template same as previous. Skipping ARM deployment");
      return;
    }

    for (const key of Object.keys(deployment.parameters)) {
      if (!deployment.parameters[key].value) {
        delete deployment.parameters[key];
      }
    }

    // Construct deployment object
    const armDeployment: Deployment = {
      properties: {
        ...deployment,
        mode: "Incremental",
      }
    };

    // Deploy ARM template
    this.log("-> Deploying ARM template...");
    this.log(`---> Resource Group: ${this.resourceGroup}`)
    this.log(`---> Deployment Name: ${this.deploymentName}`)

    try {
      const result = await this.resourceClient.deployments.createOrUpdate(
        this.resourceGroup,
        this.deploymentName,
        armDeployment
      );
      this.log("-> ARM deployment complete");
      return result;
    } catch (err) {
      const previousDeployment = await resourceService.getPreviousDeployment();
      if (previousDeployment) {
        const errorDetails: DeploymentExtendedError = previousDeployment.properties["error"];
        if (errorDetails) {
          throw new Error(this.deploymentErrorToString(errorDetails));
        }
      }
      throw err;
    }
  }

  private areDeploymentsEqual(current: ArmDeployment, previous: ArmDeployment): boolean {
    if (!current || !previous) {
      return false;
    }
    const mergedDefaultParameters = this.mergeDefaultParams(current.parameters, current.template.parameters);
    const templateNormalizer = (template: ArmResourceTemplate): ArmResourceTemplate => {
      return {
        ...template,
        resources: template.resources.map((item) => {
          return {
            ...item,
            // Currently ignoring `identity` property given to function app arm template
            identity: undefined
          }
        })
      }
    }

    const paramsNormalizer = (params: ArmParameters): ArmParameters => {
      const normalized = {};
      const keys = Object.keys(params);
      for (const key of keys) {
        const original = params[key];
        normalized[key] = {
          ...original,
          type: original.type.toLowerCase()
        }
      }
      return normalized;
    }

    return deepEqual(
      paramsNormalizer(mergedDefaultParameters),
      paramsNormalizer(previous.parameters)
    ) && deepEqual(
      templateNormalizer(previous.template),
      templateNormalizer(current.template),
    );
  }

  private deploymentErrorToString(deploymentError: DeploymentExtendedError) {
    if (!deploymentError.code || !deploymentError.message) {
      return JSON.stringify(deploymentError);
    }
    let errorString = `${deploymentError.code} - ${deploymentError.message}`;
    if (deploymentError.details) {

      errorString += [
        "------------------------",
        "DEPLOYMENT ERROR DETAILS",
        "------------------------",
      ].join("\n") + "\n"

      deploymentError.details.forEach((childError) => {
        errorString += `\n${this.deploymentErrorToString(childError)}`
      })
    }
    return errorString;
  }

  /**
   * Merge parameters and default parameters for comparison with previously deployed template
   * @param parameters Parameters with specified values
   * @param defaultParameters Parameters with `type` and `defaultValue`
   */
  private mergeDefaultParams(parameters: ArmParameters, defaultParameters: ArmParameters): ArmParameters {
    const mergedParams: ArmParameters = {}
    Object.keys(defaultParameters).forEach((key) => {
      const defaultParam = defaultParameters[key];
      const param = parameters[key];
      mergedParams[key] = {
        type: defaultParam.type,
        value: (param && param.value) ? param.value : defaultParam.value || defaultParam.defaultValue
      }
    });
    return mergedParams;
  }

  /**
   * Applies sls yaml environment variables into the appSettings section of the function app configuration
   * @param deployment The ARM deployment
   */
  private applyEnvironmentVariables(deployment: ArmDeployment) {
    // Check if there are custom environment variables defined that need to be
    // added to the ARM template used in the deployment.
    const environmentVariables = this.config.provider.environment;
    if (environmentVariables) {
      this.serverless.cli.log("-> Merging environment configuration");

      // This is a json path expression
      // Learn more @ https://goessner.net/articles/JsonPath/index.html#e2
      const appSettingsPath = "$.resources[?(@.kind==\"functionapp\")].properties.siteConfig.appSettings";

      // Merges serverless yaml environment configuration into the app settings of the template
      jsonpath.apply(deployment.template, appSettingsPath, function (appSettingsList) {
        Object.keys(environmentVariables).forEach(function (key) {
          appSettingsList.push({
            name: key,
            value: environmentVariables[key]
          });
        });

        return appSettingsList;
      });
    }
  }
}
