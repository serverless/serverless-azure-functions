import { Aborter, BlockBlobURL, ContainerURL, ServiceURL, StorageURL, uploadFileToBlockBlob } from "@azure/storage-blob";
import Serverless from "serverless";
import { BaseService } from "./baseService";
import { Guard } from "../shared/guard";

/**
 * Wrapper for operations on Azure Blob Storage account
 */
export class AzureBlobStorageService extends BaseService {

  /**
   * Account URL for Azure Blob Storage account. Depends on `storageAccountName` being set in baseService
   */
  private accountUrl: string;

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
    this.accountUrl = `https://${this.storageAccountName}.blob.core.windows.net`;
  }

  /**
   * Upload a file to Azure Blob Storage
   * @param path Path of file to upload
   * @param containerName Name of container in Azure Blob storage for upload
   * @param blobName Name of blob file created as a result of upload
   */
  public async uploadFile(path: string, containerName: string, blobName?: string) {
    Guard.empty(path);
    Guard.empty(containerName);
    // Use specified blob name or replace `/` in path with `-`
    const name = blobName || path.replace(/^.*[\\\/]/, "-");
    uploadFileToBlockBlob(Aborter.none, path, this.getBlockBlobURL(containerName, name));
  };
  
  /**
   * Delete a blob from Azure Blob Storage
   * @param containerName Name of container containing blob
   * @param blobName Blob to delete
   */
  public async deleteFile(containerName: string, blobName: string): Promise<void> {
    Guard.empty(containerName);
    Guard.empty(blobName);
    const blockBlobUrl = await this.getBlockBlobURL(containerName, blobName)
    await blockBlobUrl.delete(Aborter.none);
  }

  /**
   * Lists files in container
   * @param ext - Extension of files to filter on when retrieving files
   * from container
   */
  public async listFiles(containerName: string, ext?: string): Promise<string[]> {
    Guard.empty(containerName, "containerName");
    const result: string[] = [];
    let marker;
    const containerURL = this.getContainerURL(containerName);
    do {
      const listBlobsResponse = await containerURL.listBlobFlatSegment(
        Aborter.none,
        marker,
      );
      marker = listBlobsResponse.nextMarker;
      for (const blob of listBlobsResponse.segment.blobItems) {
        if ((ext && blob.name.endsWith(ext)) || !ext) {
          result.push(blob.name);
        }
      }
    } while (marker);

    return result;
  }

  /**
   * Lists the containers within the Azure Blob Storage account
   */
  public async listContainers() {
    const result: string[] = [];
    let marker;
    do {
      const listContainersResponse = await this.getServiceURL().listContainersSegment(
        Aborter.none,
        marker,
      );
      marker = listContainersResponse.nextMarker;
      for (const container of listContainersResponse.containerItems) {
        result.push(container.name);
      }
    } while (marker);

    return result;
  }

  /**
   * Creates container specified in Azure Cloud Storage options
   * @param containerName - Name of container to create
   */
  public async createContainer(containerName: string): Promise<void> {
    Guard.empty(containerName);
    const containerURL = this.getContainerURL(containerName);
    await containerURL.create(Aborter.none);
  }

  /**
   * Delete a container from Azure Blob Storage Account
   * @param containerName Name of container to delete
   */
  public async deleteContainer(containerName: string): Promise<void> {
    Guard.empty(containerName);
    const containerUrl = await this.getContainerURL(containerName)
    await containerUrl.delete(Aborter.none);
  }

  /**
   * Get ServiceURL object for Azure Blob Storage Account
   */
  private getServiceURL(): ServiceURL {
    const pipeline = StorageURL.newPipeline(this.credentials);
    const accountUrl = this.accountUrl;
    const serviceUrl = new ServiceURL(
      accountUrl,
      pipeline,
    );
    return serviceUrl;
  }

  /**
   * Get a ContainerURL object to perform operations on Azure Blob Storage container
   * @param containerName Name of container
   * @param serviceURL Previously created ServiceURL object (will create if undefined)
   */
  private getContainerURL(containerName: string): ContainerURL {
    Guard.empty(containerName);
    return ContainerURL.fromServiceURL(
      this.getServiceURL(),
      containerName
    );
  }

  /**
   * Get a BlockBlobURL object to perform operations on Azure Blob Storage Blob
   * @param containerName Name of container containing blob
   * @param blobName Name of blob
   */
  private getBlockBlobURL(containerName: string, blobName: string): BlockBlobURL {
    Guard.empty(containerName);
    Guard.empty(blobName);
    return BlockBlobURL.fromContainerURL(
      this.getContainerURL(containerName),
      blobName,
    );
  }
}
