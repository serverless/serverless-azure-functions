import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { ArmService } from "./armService";
import { ArmResourceTemplate, ArmTemplateType } from "../models/armTemplates";
import { ArmTemplateConfig } from "../models/serverless";
import mockFs from "mock-fs";
import jsonpath from "jsonpath";
import { Deployments } from "@azure/arm-resources";
import { Deployment } from "@azure/arm-resources/esm/models";

describe("Arm Service", () => {
  let sls: Serverless
  let service: ArmService;

  function createService() {
    return new ArmService(sls);
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
      const deployment = await service.createDeploymentFromType("premium");

      expect(deployment).not.toBeNull();
      expect(Object.keys(deployment.parameters).length).toBeGreaterThan(0);
      expect(deployment.template.resources.length).toBeGreaterThan(0);
    });

    it("Creates a custom ARM template (with APIM support) from well-known type", async () => {
      sls.service.provider["apim"] = MockFactory.createTestApimConfig();
      const deployment = await service.createDeploymentFromType(ArmTemplateType.Premium);

      expect(deployment).not.toBeNull();
      expect(Object.keys(deployment.parameters).length).toBeGreaterThan(0);
      expect(deployment.template.resources.length).toBeGreaterThan(0);

      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.ApiManagement/service")).not.toBeNull();
    });

    it("throws error when specified type is not found", async () => {
      await expect(service.createDeploymentFromType("not-found")).rejects.not.toBeNull();
    });

    it("Premium template includes correct resources", async () => {
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

    it("Appends environment variables into app settings of ARM template", async () => {
      const environmentConfig: any = {
        PARAM_1: "1",
        PARAM_2: "2",
        PARAM_3: "3",
      };

      sls.service.provider["environment"] = environmentConfig

      const deployment = await service.createDeploymentFromType(ArmTemplateType.Consumption);
      await service.deployTemplate(deployment);

      const appSettings: any[] = jsonpath.query(deployment.template, "$.resources[?(@.kind==\"functionapp\")].properties.siteConfig.appSettings[*]");
      expect(appSettings.find((setting) => setting.name === "PARAM_1")).toEqual({ name: "PARAM_1", value: environmentConfig.PARAM_1 });
      expect(appSettings.find((setting) => setting.name === "PARAM_2")).toEqual({ name: "PARAM_2", value: environmentConfig.PARAM_2 });
      expect(appSettings.find((setting) => setting.name === "PARAM_3")).toEqual({ name: "PARAM_3", value: environmentConfig.PARAM_3 });
    });

    it("Deploys ARM template via resources REST API", async () => {
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
      const expectedDeployment: Deployment = {
        properties: {
          mode: "Incremental",
          template: deployment.template,
          parameters: deploymentParameters,
        },
      };

      expect(Deployments.prototype.createOrUpdate).toBeCalledWith(expectedResourceGroup, expectedDeploymentName, expectedDeployment);
    });
  });
});