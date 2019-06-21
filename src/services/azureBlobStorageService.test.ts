import { MockFactory } from "../test/mockFactory"
import mockFs from "mock-fs";

jest.mock("@azure/storage-blob");
import { BlockBlobURL, ContainerURL, ServiceURL, Aborter, uploadFileToBlockBlob } from "@azure/storage-blob";
import { AzureBlobStorageService } from "./azureBlobStorageService";

describe("Azure Blob Storage Service", () => {

  const filePath = "deployments/deployment.zip";
  const fileName = "deployment.zip";
  const fileContents = "contents";
  const containerName = "DEPLOYMENTS";

  const containers = MockFactory.createTestAzureContainers();
  const sls = MockFactory.createTestServerless();
  const options = MockFactory.createTestServerlessOptions();
  const blockBlobUrl = MockFactory.createTestBlockBlobUrl(containerName, filePath);

  let service: AzureBlobStorageService;

  beforeAll(() => {
    BlockBlobURL.fromContainerURL = jest.fn(() => blockBlobUrl) as any;
  });

  beforeAll(() => {
    mockFs({
      "deployments/deployment.zip": fileContents
    })
  });

  afterAll(() => {
    mockFs.restore();
  });

  beforeEach(() => {
    service = new AzureBlobStorageService(sls, options);
  });

  it("uploads a file", async () => {
    uploadFileToBlockBlob.prototype = jest.fn();
    ContainerURL.fromServiceURL = jest.fn((serviceUrl, containerName) => (containerName as any));
    await service.uploadFile(filePath, containerName);
    expect(uploadFileToBlockBlob).toBeCalledWith(
      Aborter.none,
      filePath,
      blockBlobUrl
    );
  });

  it("deletes a file", async () => {
    ContainerURL.fromServiceURL = jest.fn((serviceUrl, containerName) => (containerName as any));
    await service.deleteFile(containerName, fileName);
    expect(blockBlobUrl.delete).toBeCalledWith(Aborter.none)
  });

  it("lists files of container", async () => {
    const blobs = MockFactory.createTestAzureBlobItems();
    ContainerURL.prototype.listBlobFlatSegment = jest.fn(() => Promise.resolve(blobs)) as any;
    ContainerURL.fromServiceURL = jest.fn(() => new ContainerURL(null, null));
    const files = await service.listFiles(containerName);
    expect(files.length).toEqual(5);

    const otherFiles = await service.listFiles(containerName, "jpeg");
    expect(otherFiles.length).toEqual(0);
  });

  it("lists containers", async () => {
    ServiceURL.prototype.listContainersSegment = jest.fn(() => Promise.resolve(containers));
    const containerList = await service.listContainers();
    expect(containerList).toEqual(
      containers.containerItems.map((container) => container.name));
  });

  it("creates a container", async () => {
    ContainerURL.fromServiceURL = jest.fn(() => new ContainerURL(null, null));
    ContainerURL.prototype.create = jest.fn(() => Promise.resolve({ statusCode: 201 })) as any;
    const newContainerName = "newContainer";
    await service.createContainer(newContainerName);
    expect(ContainerURL.fromServiceURL).toBeCalledWith(expect.anything(), newContainerName);
    expect(ContainerURL.prototype.create).toBeCalledWith(Aborter.none);
  });

  it("deletes a container", async () => {
    const containerToDelete = "delete container";
    ContainerURL.fromServiceURL = jest.fn(() => new ContainerURL(null, null));
    ContainerURL.prototype.delete = jest.fn(() => Promise.resolve({ statusCode: 204 })) as any;
    await service.deleteContainer(containerToDelete);
    expect(ContainerURL.fromServiceURL).toBeCalledWith(expect.anything(), containerToDelete);
    expect(ContainerURL.prototype.delete).toBeCalledWith(Aborter.none);
  });
});
