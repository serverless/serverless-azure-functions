import mockFs from "mock-fs";
import { MockFactory } from "../test/mockFactory";
import { AzureBlobStorageService, AzureStorageAuthType } from "./azureBlobStorageService";

jest.mock("@azure/storage-blob");
jest.genMockFromModule("@azure/storage-blob")
import { Aborter, BlockBlobURL, ContainerURL, ServiceURL, uploadFileToBlockBlob, TokenCredential, SharedKeyCredential } from "@azure/storage-blob";

jest.mock("@azure/arm-storage")
jest.genMockFromModule("@azure/arm-storage");
import { StorageAccounts, StorageManagementClientContext } from "@azure/arm-storage"

jest.mock("./loginService");
import { AzureLoginService } from "./loginService"

describe("Azure Blob Storage Service", () => {

  const filePath = "deployments/deployment.zip";
  const fileName = "deployment.zip";
  const fileContents = "contents";
  const containerName = "DEPLOYMENTS";

  const containers = MockFactory.createTestAzureContainers();
  const sls = MockFactory.createTestServerless();
  const accountName = "slswesdevservicenamesa";
  const options = MockFactory.createTestServerlessOptions();
  const blockBlobUrl = MockFactory.createTestBlockBlobUrl(containerName, filePath);

  let service: AzureBlobStorageService;
  const token = "myToken";
  const keyValue = "keyValue";

  beforeAll(() => {
    (SharedKeyCredential as any).mockImplementation();
    (TokenCredential as any).mockImplementation();

    StorageAccounts.prototype.listKeys = jest.fn(() => {
      return {
        keys: [
          {
            value: keyValue
          }
        ]
      }
    }) as any;

    BlockBlobURL.fromContainerURL = jest.fn(() => blockBlobUrl) as any;
    AzureLoginService.login = jest.fn(() => Promise.resolve({
      credentials: {
        getToken: jest.fn(() => {
          return {
            accessToken: token
          }
        })
      }
    } as any));
  });

  beforeAll(() => {
    mockFs({
      "deployments/deployment.zip": fileContents
    })
  });

  afterAll(() => {
    mockFs.restore();
  });

  beforeEach( async () => {
    service = new AzureBlobStorageService(sls, options);
    await service.initialize();
  });

  it("should initialize authentication", async () => {
    // Note: initialize called in beforeEach
    expect(SharedKeyCredential).toBeCalledWith(accountName, keyValue);
    expect(StorageManagementClientContext).toBeCalled();
    expect(StorageAccounts).toBeCalled();

    const tokenService = new AzureBlobStorageService(sls, options, AzureStorageAuthType.Token);
    await tokenService.initialize();
    expect(TokenCredential).toBeCalled();
  });

  it("should initialize authentication", async () => {
    await service.initialize();
    expect(TokenCredential).toBeCalledWith(token);
  });

  it("should upload a file", async () => {
    uploadFileToBlockBlob.prototype = jest.fn(() => Promise.resolve());
    ContainerURL.fromServiceURL = jest.fn((serviceUrl, containerName) => (containerName as any));
    await service.uploadFile(filePath, containerName);
    expect(uploadFileToBlockBlob).toBeCalledWith(
      Aborter.none,
      filePath,
      blockBlobUrl
    );
  });

  it("should delete a file", async () => {
    ContainerURL.fromServiceURL = jest.fn((serviceUrl, containerName) => (containerName as any));
    await service.deleteFile(containerName, fileName);
    expect(blockBlobUrl.delete).toBeCalledWith(Aborter.none)
  });

  it("should list files of container", async () => {
    const blobs = MockFactory.createTestAzureBlobItems();
    ContainerURL.prototype.listBlobFlatSegment = jest.fn(() => Promise.resolve(blobs)) as any;
    ContainerURL.fromServiceURL = jest.fn(() => new ContainerURL(null, null));
    const files = await service.listFiles(containerName);
    expect(files.length).toEqual(5);

    const otherFiles = await service.listFiles(containerName, "jpeg");
    expect(otherFiles.length).toEqual(0);
  });

  it("should list containers", async () => {
    ServiceURL.prototype.listContainersSegment = jest.fn(() => Promise.resolve(containers));
    const containerList = await service.listContainers();
    expect(containerList).toEqual(
      containers.containerItems.map((container) => container.name));
  });

  it("should create a container", async () => {
    ContainerURL.fromServiceURL = jest.fn(() => new ContainerURL(null, null));
    ContainerURL.prototype.create = jest.fn(() => Promise.resolve({ statusCode: 201 })) as any;
    const newContainerName = "newContainer";
    await service.createContainerIfNotExists(newContainerName);
    expect(ContainerURL.fromServiceURL).toBeCalledWith(expect.anything(), newContainerName);
    expect(ContainerURL.prototype.create).toBeCalledWith(Aborter.none);
  });
  
  it("should delete a container", async () => {
    const containerToDelete = "delete container";
    ContainerURL.fromServiceURL = jest.fn(() => new ContainerURL(null, null));
    ContainerURL.prototype.delete = jest.fn(() => Promise.resolve({ statusCode: 204 })) as any;
    await service.deleteContainer(containerToDelete);
    expect(ContainerURL.fromServiceURL).toBeCalledWith(expect.anything(), containerToDelete);
    expect(ContainerURL.prototype.delete).toBeCalledWith(Aborter.none);
  });
});
