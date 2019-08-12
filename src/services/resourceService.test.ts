import { ResourceManagementClient } from "@azure/arm-resources";
import { DeploymentsListByResourceGroupResponse } from "@azure/arm-resources/esm/models";
import { MockFactory } from "../test/mockFactory";
import { AzureNamingService } from "./namingService";
import { ResourceService } from "./resourceService";

jest.mock("@azure/arm-resources")

describe("Resource Service", () => {
  let deployments: DeploymentsListByResourceGroupResponse;
  const template = "myTemplate";

  beforeEach(() => {
    deployments = MockFactory.createTestDeployments(5, true);
    ResourceManagementClient.prototype.resourceGroups = {
      createOrUpdate: jest.fn(),
      deleteMethod: jest.fn(),
    } as any;

    ResourceManagementClient.prototype.deployments = {
      deleteMethod: jest.fn(),
      listByResourceGroup: jest.fn(() => Promise.resolve(deployments)),
      exportTemplate: jest.fn(() => Promise.resolve(template)),
    } as any;
  });

  it("throws error with empty credentials", () => {
    const sls = MockFactory.createTestServerless();
    delete sls.variables["azureCredentials"]
    const options = MockFactory.createTestServerlessOptions();
    expect(() => new ResourceService(sls, options)).toThrowError("Azure Credentials has not been set in ResourceService")
  });

  it("initializes a resource service", () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    expect(() => new ResourceService(sls, options)).not.toThrowError();
  });

  it("deploys a resource group", () => {
    const sls = MockFactory.createTestServerless();
    const resourceGroup = "myResourceGroup"
    const location = "West Us";
    const expectedLocation = AzureNamingService.getNormalizedRegionName(location);
    sls.service.provider["resourceGroup"] = resourceGroup
    sls.service.provider.region = location;
    sls.variables["azureCredentials"] = "fake credentials"
    const options = MockFactory.createTestServerlessOptions();
    const service = new ResourceService(sls, options);
    service.deployResourceGroup();

    expect(ResourceManagementClient.prototype.resourceGroups.createOrUpdate)
      .toBeCalledWith(resourceGroup, { location: expectedLocation });
  });

  it("deletes a deployment", () => {
    const sls = MockFactory.createTestServerless();
    const resourceGroup = "myResourceGroup";
    const deploymentName = "myDeployment";
    sls.service.provider["resourceGroup"] = resourceGroup
    sls.service.provider["deploymentName"] = deploymentName;
    sls.variables["azureCredentials"] = "fake credentials"
    const options = MockFactory.createTestServerlessOptions();
    const service = new ResourceService(sls, options);
    service.deleteDeployment();
    const call = (ResourceManagementClient.prototype.deployments.deleteMethod as any).mock.calls[0];
    expect(call[0]).toEqual(resourceGroup);
    const expectedDeploymentNameRegex = new RegExp(deploymentName + "-t([0-9]+)")
    expect(call[1]).toMatch(expectedDeploymentNameRegex)
  });

  it("deletes a resource group", () => {
    const sls = MockFactory.createTestServerless();
    const resourceGroup = "myResourceGroup";
    sls.service.provider["resourceGroup"] = resourceGroup
    sls.variables["azureCredentials"] = "fake credentials"
    const options = MockFactory.createTestServerlessOptions();
    const service = new ResourceService(sls, options);
    service.deleteResourceGroup();
    expect(ResourceManagementClient.prototype.resourceGroups.deleteMethod)
      .toBeCalledWith(resourceGroup);
  });

  it("gets deployments", async () => {
    const sls = MockFactory.createTestServerless();
    const resourceGroup = "myResourceGroup";
    sls.service.provider["resourceGroup"] = resourceGroup
    sls.variables["azureCredentials"] = "fake credentials"
    const options = MockFactory.createTestServerlessOptions();
    const service = new ResourceService(sls, options);
    const deps = await service.getDeployments();
    // Make sure deps are in correct order
    expect(deps).toEqual(deployments);
  });

  it("lists deployments as string with timestamps", async () => {
    const sls = MockFactory.createTestServerless();
    const resourceGroup = "myResourceGroup";
    sls.service.provider["resourceGroup"] = resourceGroup
    sls.variables["azureCredentials"] = "fake credentials"
    const options = MockFactory.createTestServerlessOptions();
    const service = new ResourceService(sls, options);
    const deploymentString = await service.listDeployments();
    let expectedDeploymentString = "\n\nDeployments";
    const originalTimestamp = +MockFactory.createTestTimestamp();
    let i = 0
    for (const dep of deployments) {
      const timestamp = originalTimestamp + i
      expectedDeploymentString += "\n-----------\n"
      expectedDeploymentString += `Name: ${dep.name}\n`
      expectedDeploymentString += `Timestamp: ${timestamp}\n`;
      expectedDeploymentString += `Datetime: ${new Date(timestamp).toISOString()}\n`
      i++
    }
    expectedDeploymentString += "-----------\n"
    expect(deploymentString).toEqual(expectedDeploymentString);
  });

  it("lists deployments as string without timestamps", async () => {
    deployments = MockFactory.createTestDeployments();
    ResourceManagementClient.prototype.deployments = {
      listByResourceGroup: jest.fn(() => Promise.resolve(deployments)),
    } as any;

    const sls = MockFactory.createTestServerless();
    const resourceGroup = "myResourceGroup";
    sls.service.provider["resourceGroup"] = resourceGroup
    sls.variables["azureCredentials"] = "fake credentials"
    const options = MockFactory.createTestServerlessOptions();
    const service = new ResourceService(sls, options);
    const deploymentString = await service.listDeployments();
    let expectedDeploymentString = "\n\nDeployments";
    for (const dep of deployments) {
      expectedDeploymentString += "\n-----------\n"
      expectedDeploymentString += `Name: ${dep.name}\n`
      expectedDeploymentString += "Timestamp: None\n";
      expectedDeploymentString += "Datetime: None\n"
    }
    expectedDeploymentString += "-----------\n"
    expect(deploymentString).toEqual(expectedDeploymentString);
  });

  it("gets deployment template",async () => {
    const sls = MockFactory.createTestServerless();
    const resourceGroup = "myResourceGroup";
    sls.service.provider["resourceGroup"] = resourceGroup
    sls.variables["azureCredentials"] = "fake credentials"
    const options = MockFactory.createTestServerlessOptions();
    const service = new ResourceService(sls, options);
    const deploymentName = "myDeployment";
    const result = await service.getDeploymentTemplate(deploymentName);
    expect(ResourceManagementClient.prototype.deployments.exportTemplate)
      .toBeCalledWith(
        resourceGroup,
        deploymentName
      );
    expect(result).toEqual(template);
  });
});
