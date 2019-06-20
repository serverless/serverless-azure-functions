import { MockFactory } from "../test/mockFactory";
import { ResourceService } from "./resourceService";


jest.mock("@azure/arm-resources")
import { ResourceManagementClient } from "@azure/arm-resources";

describe("Resource Service", () => {

  beforeAll(() => {
    ResourceManagementClient.prototype.resourceGroups = {
      createOrUpdate: jest.fn(),
      deleteMethod: jest.fn(),
    } as any;

    ResourceManagementClient.prototype.deployments = {
      deleteMethod: jest.fn()
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
    sls.service.provider["resourceGroup"] = resourceGroup
    sls.service.provider.region = location;
    sls.variables["azureCredentials"] = "fake credentials"
    const options = MockFactory.createTestServerlessOptions();
    const service = new ResourceService(sls, options);
    service.deployResourceGroup();
    expect(ResourceManagementClient.prototype.resourceGroups.createOrUpdate)
      .toBeCalledWith(resourceGroup, { location });
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
    expect(ResourceManagementClient.prototype.deployments.deleteMethod)
      .toBeCalledWith(resourceGroup, deploymentName);
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
});