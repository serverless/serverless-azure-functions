import mockFs from "mock-fs";
import path from "path";
import Serverless from "serverless";
import { ArmDeployment } from "../models/armTemplates";
import { DeploymentConfig } from "../models/serverless";
import { MockFactory } from "../test/mockFactory";
import { RollbackService } from "./rollbackService";

jest.mock("./azureBlobStorageService");
import { AzureBlobStorageService } from "./azureBlobStorageService";

jest.mock("./resourceService");
import { ResourceService } from "./resourceService";

jest.mock("./functionAppService")
import { FunctionAppService } from "./functionAppService";

jest.mock("./armService");
import { ArmService } from "./armService";
import configConstants from "../config";

describe("Rollback Service", () => {

  const template = MockFactory.createTestArmTemplate();
  const parameters = MockFactory.createTestParameters();
  for (const p of Object.keys(parameters)) {
    parameters[p] = parameters[p].value
  }
  const appStub = "appStub";
  const sasURL = "sasURL";
  const containerName = "deployment-artifacts";
  const artifactName = MockFactory.createTestDeployment().name.replace(
    configConstants.naming.suffix.deployment, configConstants.naming.suffix.artifact) + ".zip";
  const artifactPath = `.serverless${path.sep}${artifactName}`
  const armDeployment: ArmDeployment = { template, parameters };
  const deploymentString = "deployments";

  function createOptions(timestamp?: string): Serverless.Options {
    return {
      ...MockFactory.createTestServerlessOptions(),
      timestamp: timestamp || MockFactory.createTestTimestamp(),
    } as any
  }

  function createService(sls?: Serverless, options?: Serverless.Options): RollbackService {
    return new RollbackService(
      sls || MockFactory.createTestServerless(),
      options || createOptions(),
    )
  }

  beforeEach(() => {
    // Mocking the file system so that files are not created in project directory
    mockFs({})
    ResourceService.prototype.getDeployments = jest.fn(() => Promise.resolve(
      [
        ...MockFactory.createTestDeployments(5, true),
        MockFactory.createTestDeployment("noTimestamp")
      ]
    )) as any;
    ResourceService.prototype.getDeploymentTemplate = jest.fn(
      () => Promise.resolve({ template })
    ) as any;
    ResourceService.prototype.listDeployments = jest.fn(() => Promise.resolve(deploymentString))
    AzureBlobStorageService.prototype.generateBlobSasTokenUrl = jest.fn(() => sasURL) as any;
    FunctionAppService.prototype.get = jest.fn(() => appStub) as any;
  });

  afterEach(() => {
    mockFs.restore();
    jest.resetAllMocks();
  });

  it("should return early with no timestamp", async () => {
    const sls = MockFactory.createTestServerless();
    const options = {} as any;
    const service = createService(sls, options);
    await service.rollback();
    expect(sls.cli.log).lastCalledWith(
      deploymentString,
      undefined,
      undefined
    );
  });

  it("should return early with invalid timestamp", async () => {
    const sls = MockFactory.createTestServerless();
    const timestamp = "garbage";
    const options = createOptions(timestamp)
    const service = createService(sls, options);
    await service.rollback();
    const calls = (sls.cli.log as any).mock.calls;
    expect(calls[0][0]).toEqual(`Couldn't find deployment with timestamp: ${timestamp}`);
  });

  it("should deploy blob package directly to function app", async () => {
    const service = createService();
    await service.rollback();
    expect(AzureBlobStorageService.prototype.initialize).toBeCalled();
    expect(ArmService.prototype.deployTemplate).toBeCalledWith(armDeployment);
    expect(AzureBlobStorageService.prototype.downloadBinary).toBeCalledWith(
      containerName,
      artifactName,
      artifactPath,
    );
    expect(FunctionAppService.prototype.get).toBeCalled();
    expect(FunctionAppService.prototype.uploadZippedArfifactToFunctionApp).toBeCalledWith(
      appStub,
      artifactPath
    )
  });

  it("should deploy function app with SAS URL", async () => {
    const sls = MockFactory.createTestServerless();
    const deploymentConfig: DeploymentConfig = {
      runFromBlobUrl: true
    }
    sls.service.provider["deployment"] = deploymentConfig;
    const service = createService(sls);
    await service.rollback();
    expect(AzureBlobStorageService.prototype.initialize).toBeCalled();
    expect(ArmService.prototype.deployTemplate).toBeCalledWith({
      ...armDeployment,
      parameters: {
        ...armDeployment.parameters,
        functionAppRunFromPackage: sasURL,
      }
    });
    expect(AzureBlobStorageService.prototype.downloadBinary).not.toBeCalled();
    expect(AzureBlobStorageService.prototype.generateBlobSasTokenUrl).toBeCalledWith(
      containerName,
      artifactName
    );
    expect(FunctionAppService.prototype.get).not.toBeCalled();
    expect(FunctionAppService.prototype.uploadZippedArfifactToFunctionApp).not.toBeCalled();
  });
});
