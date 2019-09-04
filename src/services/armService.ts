import { ResourceManagementClient } from "@azure/arm-resources";
import { Deployment, DeploymentExtended } from "@azure/arm-resources/esm/models";
import fs from "fs";
import jsonpath from "jsonpath";
import path from "path";
import Serverless from "serverless";
import { ArmDeployment, ArmResourceTemplateGenerator, ArmTemplateType } from "../models/armTemplates";
import { ArmTemplateConfig, ServerlessAzureConfig, ServerlessAzureOptions } from "../models/serverless";
import { Guard } from "../shared/guard";
import { BaseService } from "./baseService";
import { ResourceService } from "./resourceService"
import deepEqual from "deep-equal";
import { DeploymentExtendedError } from "../models/azureProvider";

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

    const azureConfig: ServerlessAzureConfig = this.serverless.service as any;
    const mergedTemplate = template.getTemplate();
    let parameters = template.getParameters(azureConfig);

    if (this.config.provider.apim) {
      const apimTemplate = apimResource.getTemplate();
      const apimParameters = apimResource.getParameters(azureConfig);

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

    // Convert flat parameter list into ARM parameter format
    const deploymentParameters = {};
    Object.keys(deployment.parameters).forEach((key) => {
      const parameterValue = deployment.parameters[key];
      if (parameterValue) {
        deploymentParameters[key] = { value: parameterValue }
      }
    });

    // Construct deployment object
    const armDeployment: Deployment = {
      properties: {
        mode: "Incremental",
        template: deployment.template,
        parameters: deploymentParameters,
      }
    };

    const resourceService = new ResourceService(this.serverless, this.options);
    const latest = await resourceService.getLastDeploymentTemplate();

    if (latest) {
      const templateEqual = deepEqual(latest.template, deployment.template);
      const mergedDefaultParameters = this.mergeDefaultParams(deploymentParameters, deployment.template.parameters);
      const paramatersEqual = deepEqual(latest.parameters, mergedDefaultParameters);

      if (templateEqual && paramatersEqual) {
        this.log("Generated template same as previous. Skipping ARM deployment");
        return;
      }
    }

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
      const lastDeployment = await resourceService.getLastDeployment();
      const errorDetails: DeploymentExtendedError = lastDeployment.properties["error"];
      if (errorDetails) {
        throw new Error(this.deploymentErrorToString(errorDetails));
      }
    }
  }

  private deploymentErrorToString(deploymentError: DeploymentExtendedError) {
    if (!deploymentError.code || !deploymentError.message) {
      return JSON.stringify(deploymentError);
    }
    let errorString = `${deploymentError.code} - ${deploymentError.message}`;
    if (deploymentError.details) {

      errorString += `
      ------------------------
      DEPLOYMENT ERROR DETAILS
      ------------------------\n`
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
  private mergeDefaultParams(parameters: any, defaultParameters: any) {
    const mergedParams = {}
    Object.keys(defaultParameters).forEach((key) => {
      const defaultParam = defaultParameters[key];
      mergedParams[key] = {
        type: defaultParam.type,
        value: (key in parameters)
          ?
          parameters[key].value
          :
          defaultParameters[key].defaultValue
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
