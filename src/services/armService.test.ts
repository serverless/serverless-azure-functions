import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { ArmService } from "./armService";
import { ArmResourceTemplate, ArmTemplateType, ArmDeployment, ArmTemplateProvisioningState } from "../models/armTemplates";
import { ArmTemplateConfig, ServerlessAzureOptions } from "../models/serverless";
import mockFs from "mock-fs";
import jsonpath from "jsonpath";
import { Deployments } from "@azure/arm-resources";
import { Deployment, DeploymentExtended } from "@azure/arm-resources/esm/models";
import { ResourceService } from "./resourceService";
import { DeploymentExtendedError } from "../models/azureProvider";

describe("Arm Service", () => {
  let sls: Serverless
  let service: ArmService;
  let options: ServerlessAzureOptions;

  function createService() {
    return new ArmService(sls, options);
  }

  beforeEach(() => {
    sls = MockFactory.createTestServerless();
    sls.service.provider["prefix"] = "myapp";
    sls.service.provider.region = "westus";
    sls.service.provider.stage = "dev";
    sls.variables = {
      ...sls.variables,
      azureCredentials: MockFactory.createTestAzureCredentials(),
      subscriptionId: "ABC123",
    };

    service = createService();
    ResourceService.prototype.getDeployments = jest.fn(() => Promise.resolve(MockFactory.createTestDeployments())) as any;
    ResourceService.prototype.getDeploymentTemplate = jest.fn(() => {
      return {
        template: MockFactory.createTestArmTemplate()
      }
    }) as any;
  })

  afterEach(() => {
    mockFs.restore();
  })

  describe("Creating Templates", () => {
    it("Creates an ARM template from a specified file", async () => {
      const armTemplateConfig: ArmTemplateConfig = {
        file: "armTemplates/custom-template.json",
        parameters: {
          param1: "1",
          param2: "2",
        },
      };

      const testTemplate: ArmResourceTemplate = MockFactory.createTestArmTemplate();

      mockFs({
        "armTemplates": {
          "custom-template.json": JSON.stringify(testTemplate),
        },
      });

      sls.service.provider["armTemplate"] = armTemplateConfig;
      const deployment = await service.createDeploymentFromConfig(sls.service.provider["armTemplate"]);

      expect(deployment).not.toBeNull();
      expect(deployment.template.parameters).toEqual(testTemplate.parameters);
      expect(deployment.template.resources).toEqual(testTemplate.resources);
      expect(deployment.parameters).toEqual(armTemplateConfig.parameters);
    });

    it("Creates a custom ARM template from well-known type", async () => {
      sls.service.provider.runtime = "nodejs6.9.x";
      const deployment = await service.createDeploymentFromType("premium");

      expect(deployment).not.toBeNull();
      expect(Object.keys(deployment.parameters).length).toBeGreaterThan(0);
      expect(deployment.template.resources.length).toBeGreaterThan(0);
    });

    it("Creates a custom ARM template (with APIM support) from well-known type", async () => {
      sls.service.provider["apim"] = MockFactory.createTestApimConfig();
      sls.service.provider.runtime = "nodejs10.6.x";
      const deployment = await service.createDeploymentFromType(ArmTemplateType.Premium);

      expect(deployment).not.toBeNull();
      expect(Object.keys(deployment.parameters).length).toBeGreaterThan(0);
      expect(deployment.template.resources.length).toBeGreaterThan(0);

      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.ApiManagement/service")).not.toBeNull();
    });

    it("throws error when specified type is not found", async () => {
      await expect(service.createDeploymentFromType("not-found")).rejects.not.toBeNull();
    });

    it("throws error when invalid nodejs version in defined", async () => {
      sls.service.provider.runtime = "nodejs10.6.1";
      await expect(service.createDeploymentFromType("premium")).rejects.toThrowError("Could not find runtime version matching nodejs10.6.1");
    });

    it("throws error when incomplete nodejs version in defined", async () => {
      sls.service.provider.runtime = "nodejs8";
      await expect(service.createDeploymentFromType("premium")).rejects.toThrowError("Could not find runtime version matching nodejs8");
    });

    it("throws error when unsupported nodejs version in defined", async () => {
      sls.service.provider.runtime = "nodejs5.x";
      await expect(service.createDeploymentFromType("premium")).rejects.toThrowError("Could not find runtime version matching nodejs5.x");
    });

    it("Does not throw an error when valid nodejs version is defined", async () => {
      sls.service.provider.runtime = "nodejs10.x";
      await expect(service.createDeploymentFromType("premium")).resolves.not.toThrow();
    });

    it("Does not throw an error when nodejs version with major and minor is defined", async () => {
      sls.service.provider.runtime = "nodejs6.9.x";
      await expect(service.createDeploymentFromType("premium")).resolves.not.toThrow();
    });

    it("Does not throw an error when specific nodejs version is defined", async () => {
      sls.service.provider.runtime = "nodejs10.6.0";
      await expect(service.createDeploymentFromType("premium")).resolves.not.toThrow();
    });

    it("throws an error when no nodejs version is defined", async () => {
      sls.service.provider.runtime = undefined;
      await expect(service.createDeploymentFromType("premium")).rejects.toThrowError("Runtime version not specified in serverless.yml");
    });

    it("Premium template includes correct resources", async () => {
      sls.service.provider.runtime = "nodejs10.14.1";
      const deployment = await service.createDeploymentFromType(ArmTemplateType.Premium);

      expect(deployment.template.parameters.appServicePlanSkuTier.defaultValue).toEqual("ElasticPremium");
      expect(deployment.template.parameters.appServicePlanSkuName.defaultValue).toEqual("EP1");

      // Should not contain
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Web/hostingEnvironments")).toBeUndefined();
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Network/virtualNetworks")).toBeUndefined();

      // Should contain
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Web/serverfarms")).not.toBeNull();
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Web/sites")).not.toBeNull();
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Storage/storageAccounts")).not.toBeNull();
      expect(deployment.template.resources.find((resource) => resource.type === "microsoft.insights/components")).not.toBeNull();

      // Verify the ARM template includes the linkage to the correct server farm
      const functionApp = deployment.template.resources.find((res) => res.type === "Microsoft.Web/sites");
      expect(functionApp.dependsOn).toContain("[concat('Microsoft.Web/serverfarms/', parameters('appServicePlanName'))]");
      expect(functionApp.properties.serverFarmId).toEqual("[resourceId('Microsoft.Web/serverfarms', parameters('appServicePlanName'))]");
    });

    it("ASE template includes correct resources", async () => {
      sls.service.provider.runtime = "nodejs10.14.1";
      const deployment = await service.createDeploymentFromType(ArmTemplateType.AppServiceEnvironment);

      expect(deployment.template.parameters.appServicePlanSkuTier.defaultValue).toEqual("Isolated");
      expect(deployment.template.parameters.appServicePlanSkuName.defaultValue).toEqual("I1");

      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Web/hostingEnvironments")).not.toBeNull();
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Network/virtualNetworks")).not.toBeNull();
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Web/serverfarms")).not.toBeNull();
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Web/sites")).not.toBeNull();
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Storage/storageAccounts")).not.toBeNull();
      expect(deployment.template.resources.find((resource) => resource.type === "microsoft.insights/components")).not.toBeNull();

      // Verify the ARM template includes the linkage to the correct server farm
      const appServicePlan = deployment.template.resources.find((res) => res.type === "Microsoft.Web/serverfarms");
      expect(appServicePlan.dependsOn).toContain("[resourceId('Microsoft.Web/hostingEnvironments', parameters('hostingEnvironmentName'))]");
      expect(appServicePlan.properties.hostingEnvironmentProfile.id).toEqual("[resourceId('Microsoft.Web/hostingEnvironments', parameters('hostingEnvironmentName'))]");

      // Verify the ARM template includes the linkage to the correct hosting environment
      const functionApp = deployment.template.resources.find((res) => res.type === "Microsoft.Web/sites");
      expect(functionApp.dependsOn).toContain("[concat('Microsoft.Web/serverfarms/', parameters('appServicePlanName'))]");
      expect(functionApp.properties.serverFarmId).toEqual("[resourceId('Microsoft.Web/serverfarms', parameters('appServicePlanName'))]");
      expect(functionApp.properties.hostingEnvironmentProfile.id).toEqual("[resourceId('Microsoft.Web/hostingEnvironments', parameters('hostingEnvironmentName'))]");
    });

    it("Consumption template includes correct resources", async () => {
      sls.service.provider.runtime = "nodejs10.x";
      const deployment = await service.createDeploymentFromType(ArmTemplateType.Consumption);

      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Web/hostingEnvironments")).toBeUndefined();
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Network/virtualNetworks")).toBeUndefined();
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Web/serverfarms")).toBeUndefined();

      // Should contain
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Web/sites")).not.toBeNull();
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Storage/storageAccounts")).not.toBeNull();
      expect(deployment.template.resources.find((resource) => resource.type === "microsoft.insights/components")).not.toBeNull();
    });
  });

  describe("Deploying Templates", () => {
    beforeEach(() => {
      Deployments.prototype.createOrUpdate = jest.fn(() => Promise.resolve(null));
    });

    it("Does not deploy if previously deployed template is the same", async () => {
      const deployment: ArmDeployment = {
        parameters: MockFactory.createTestParameters(false),
        template: MockFactory.createTestArmTemplate()
      };
      await service.deployTemplate(deployment);
      expect(Deployments.prototype.createOrUpdate).not.toBeCalled()
    });

    it("Calls deploy if previous template is the same but failed", async () => {
      const deployments = MockFactory.createTestDeployments();
      const failedDeployment: DeploymentExtended = {
        ...deployments[0],
        properties: {
          ...deployments[0].properties,
          provisioningState: ArmTemplateProvisioningState.FAILED
        }
      }
      deployments[0] = failedDeployment;
      ResourceService.prototype.getDeployments = jest.fn(() => Promise.resolve(deployments))

      const deployment: ArmDeployment = {
        parameters: MockFactory.createTestParameters(false),
        template: MockFactory.createTestArmTemplate()
      };
      await service.deployTemplate(deployment);
      expect(Deployments.prototype.createOrUpdate).toBeCalled();
    });

    it("Calls deploy if parameters have changed from deployed template", async () => {
      const deployment: ArmDeployment = {
        parameters: MockFactory.createTestParameters(false),
        template: MockFactory.createTestArmTemplate()
      };
      deployment.parameters.param1 = "3"
      await service.deployTemplate(deployment);
      expect(Deployments.prototype.createOrUpdate).toBeCalled();
    });

    it("Calls deploy if previously deployed template is different", async () => {
      ResourceService.prototype.getDeploymentTemplate = jest.fn(() => {
        return {
          template: {}
        }
      }) as any;
      const deployment: ArmDeployment = {
        parameters: MockFactory.createTestParameters(false),
        template: MockFactory.createTestArmTemplate()
      };
      await service.deployTemplate(deployment);
      expect(Deployments.prototype.createOrUpdate).toBeCalled()
    });

    it("Calls deploy if running first deployment", async () => {
      ResourceService.prototype.getDeployments = jest.fn(() => {
        return []
      }) as any;
      const deployment: ArmDeployment = {
        parameters: MockFactory.createTestParameters(false),
        template: MockFactory.createTestArmTemplate()
      };
      await service.deployTemplate(deployment);
      expect(Deployments.prototype.createOrUpdate).toBeCalled()
    });

    it("Appends environment variables into app settings of ARM template", async () => {
      const environmentConfig: any = {
        PARAM_1: "1",
        PARAM_2: "2",
        PARAM_3: "3",
      };

      sls.service.provider["environment"] = environmentConfig
      sls.service.provider.runtime = "nodejs10.x";

      const deployment = await service.createDeploymentFromType(ArmTemplateType.Consumption);
      await service.deployTemplate(deployment);

      const appSettings: any[] = jsonpath.query(deployment.template, "$.resources[?(@.kind==\"functionapp\")].properties.siteConfig.appSettings[*]");
      expect(appSettings.find((setting) => setting.name === "PARAM_1")).toEqual({ name: "PARAM_1", value: environmentConfig.PARAM_1 });
      expect(appSettings.find((setting) => setting.name === "PARAM_2")).toEqual({ name: "PARAM_2", value: environmentConfig.PARAM_2 });
      expect(appSettings.find((setting) => setting.name === "PARAM_3")).toEqual({ name: "PARAM_3", value: environmentConfig.PARAM_3 });
    });

    it("Deploys ARM template via resources REST API", async () => {
      sls.service.provider.runtime = "nodejs10.x";
      const deployment = await service.createDeploymentFromType(ArmTemplateType.Consumption);
      const deploymentParameters = {};
      Object.keys(deployment.parameters).forEach((key) => {
        const parameterValue = deployment.parameters[key];
        if (parameterValue) {
          deploymentParameters[key] = { value: deployment.parameters[key] };
        }
      });

      await service.deployTemplate(deployment);

      const expectedResourceGroup = sls.service.provider["resourceGroup"];
      const expectedDeploymentName = sls.service.provider["deploymentName"] || `${this.resourceGroup}-deployment`;
      const expectedDeploymentNameRegex = new RegExp(expectedDeploymentName + "-t([0-9]+)")
      const expectedDeployment: Deployment = {
        properties: {
          mode: "Incremental",
          template: deployment.template,
          parameters: deploymentParameters,
        },
      };

      const call = (Deployments.prototype.createOrUpdate as any).mock.calls[0];
      expect(call[0]).toEqual(expectedResourceGroup);
      expect(call[1]).toMatch(expectedDeploymentNameRegex);
      expect(call[2]).toEqual(expectedDeployment);
    });

    it("Throws more detailed error message upon failed ARM deployment", async () => {
      Deployments.prototype.createOrUpdate = jest.fn(() => Promise.reject(null));
      const lastDeploymentError: DeploymentExtendedError = {
        code: "DeploymentFailed",
        message: "At least one resource deployment operation failed. Please list deployment operations for details. Please see https://aka.ms/arm-debug for usage details.",
        details: [
          {
            code: "ServiceAlreadyExists",
            message: "Api service already exists: abc-123-apim"
          },
          {
            code: "StorageAccountAlreadyTaken",
            message: "The storage account named ABC123 is already taken."
          }
        ]
      }
      ResourceService.prototype.getLastDeployment = jest.fn(() => Promise.resolve({
        properties: {
          error: lastDeploymentError
        }
      })) as any;
      const deployment: ArmDeployment = {
        parameters: MockFactory.createTestParameters(false),
        template: MockFactory.createTestArmTemplate()
      };
      deployment.parameters.param1 = "3"
      const { code, message, details } = lastDeploymentError;
      let errorPattern = [
        code,
        message,
        details[0].code,
        details[0].message,
        details[1].code,
        details[1].message
      ].join(".*")
      await expect(service.deployTemplate(deployment))
        .rejects
        .toThrowError(
          new RegExp(`.*${errorPattern}.*`,"s")
        );
    });
  });
});
