import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { ArmService } from "./armService";

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

  describe("Creating Templates", () => {
    it("Creates a custom ARM template from well-known type", async () => {
      const deployment = await service.createDeployment("premium");

      expect(deployment).not.toBeNull();
      expect(Object.keys(deployment.parameters).length).toBeGreaterThan(0);
      expect(deployment.template.resources.length).toBeGreaterThan(0);
    });

    it("Creates a custom ARM template (with APIM support) from well-known type", async () => {
      sls.service.provider["apim"] = MockFactory.createTestApimConfig();
      const deployment = await service.createDeployment("premium");

      expect(deployment).not.toBeNull();
      expect(Object.keys(deployment.parameters).length).toBeGreaterThan(0);
      expect(deployment.template.resources.length).toBeGreaterThan(0);

      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.ApiManagement/service")).not.toBeNull();
    });

    it("throws error when specified type is not found", async () => {
      await expect(service.createDeployment("not-found")).rejects.not.toBeNull();
    });

    it("Premium template includes correct resources", async () => {
      const deployment = await service.createDeployment("premium");

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
    });

    it("ASE template includes correct resources", async () => {
      const deployment = await service.createDeployment("ase");

      expect(deployment.template.parameters.appServicePlanSkuTier.defaultValue).toEqual("Isolated");
      expect(deployment.template.parameters.appServicePlanSkuName.defaultValue).toEqual("I1");

      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Web/hostingEnvironments")).not.toBeNull();
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Network/virtualNetworks")).not.toBeNull();
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Web/serverfarms")).not.toBeNull();
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Web/sites")).not.toBeNull();
      expect(deployment.template.resources.find((resource) => resource.type === "Microsoft.Storage/storageAccounts")).not.toBeNull();
      expect(deployment.template.resources.find((resource) => resource.type === "microsoft.insights/components")).not.toBeNull();
    });

    it("Consumption template includes correct resources", async () => {
      const deployment = await service.createDeployment("consumption");

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

  });
});