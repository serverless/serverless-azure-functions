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
    sls.variables = {
      ...sls.variables,
      azureCredentials: MockFactory.createTestAzureCredentials(),
      subscriptionId: "ABC123",
    };

    service = createService();
  })

  describe("Creating Templates", () => {
    it("Creates a custom ARM template from well-known type", async () => {
      const template = await service.createTemplate("premium");

      expect(template).not.toBeNull();
      expect(Object.keys(template.parameters).length).toBeGreaterThan(0);
      expect(template.resources.length).toBeGreaterThan(0);
    });

    it("Creates a custom ARM template (with APIM support) from well-known type", async () => {
      sls.service.provider["apim"] = MockFactory.createTestApimConfig();
      const template = await service.createTemplate("premium");

      expect(template).not.toBeNull();
      expect(Object.keys(template.parameters).length).toBeGreaterThan(0);
      expect(template.resources.length).toBeGreaterThan(0);

      expect(template.resources.find((resource) => resource.type === "Microsoft.ApiManagement/service")).not.toBeNull();
    });

    it("throws error when specified type is not found", async () => {
      await expect(service.createTemplate("not-found")).rejects.not.toBeNull();
    });

    it("Premium template includes correct resources", async () => {
      const template = await service.createTemplate("premium");

      expect(template.parameters.appServicePlanSkuTier.defaultValue).toEqual("ElasticPremium");
      expect(template.parameters.appServicePlanSkuName.defaultValue).toEqual("EP1");

      // Should not contain
      expect(template.resources.find((resource) => resource.type === "Microsoft.Web/hostingEnvironments")).toBeUndefined();
      expect(template.resources.find((resource) => resource.type === "Microsoft.Network/virtualNetworks")).toBeUndefined();

      // Should contain
      expect(template.resources.find((resource) => resource.type === "Microsoft.Web/serverfarms")).not.toBeNull();
      expect(template.resources.find((resource) => resource.type === "Microsoft.Web/sites")).not.toBeNull();
      expect(template.resources.find((resource) => resource.type === "Microsoft.Storage/storageAccounts")).not.toBeNull();
      expect(template.resources.find((resource) => resource.type === "microsoft.insights/components")).not.toBeNull();
    });

    it("ASE template includes correct resources", async () => {
      const template = await service.createTemplate("ase");

      expect(template.parameters.appServicePlanSkuTier.defaultValue).toEqual("Isolated");
      expect(template.parameters.appServicePlanSkuName.defaultValue).toEqual("I1");

      expect(template.resources.find((resource) => resource.type === "Microsoft.Web/hostingEnvironments")).not.toBeNull();
      expect(template.resources.find((resource) => resource.type === "Microsoft.Network/virtualNetworks")).not.toBeNull();
      expect(template.resources.find((resource) => resource.type === "Microsoft.Web/serverfarms")).not.toBeNull();
      expect(template.resources.find((resource) => resource.type === "Microsoft.Web/sites")).not.toBeNull();
      expect(template.resources.find((resource) => resource.type === "Microsoft.Storage/storageAccounts")).not.toBeNull();
      expect(template.resources.find((resource) => resource.type === "microsoft.insights/components")).not.toBeNull();
    });

    it("Consumption template includes correct resources", async () => {
      const template = await service.createTemplate("consumption");

      expect(template.resources.find((resource) => resource.type === "Microsoft.Web/hostingEnvironments")).toBeUndefined();
      expect(template.resources.find((resource) => resource.type === "Microsoft.Network/virtualNetworks")).toBeUndefined();
      expect(template.resources.find((resource) => resource.type === "Microsoft.Web/serverfarms")).toBeUndefined();

      // Should contain
      expect(template.resources.find((resource) => resource.type === "Microsoft.Web/sites")).not.toBeNull();
      expect(template.resources.find((resource) => resource.type === "Microsoft.Storage/storageAccounts")).not.toBeNull();
      expect(template.resources.find((resource) => resource.type === "microsoft.insights/components")).not.toBeNull();
    });
  });

  describe("Deploying Templates", () => {

  });
});