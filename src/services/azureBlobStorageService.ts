import { StorageAccounts, StorageManagementClientContext } from "@azure/arm-storage";
import { Aborter, BlobSASPermissions, BlockBlobURL, ContainerURL,
  generateBlobSASQueryParameters, SASProtocol, ServiceURL, SharedKeyCredential,
  StorageURL, TokenCredential, uploadFileToBlockBlob, downloadBlobToBuffer } from "@azure/storage-blob";
import fs from "fs";
import Serverless from "serverless";
import { Guard } from "../shared/guard";
import { BaseService } from "./baseService";
import { AzureLoginService } from "./loginService";

/**
 * Type of authentication with Azure Storage
 * @member SharedKey - Retrieve and use a Shared Key for Azure Blob BStorage
 * @member Token - Retrieve and use an Access Token to authenticate with Azure Blob Storage
 */
export enum AzureStorageAuthType {
  SharedKey,
  Token
}

/**
 * Wrapper for operations on Azure Blob Storage account
 */
export class AzureBlobStorageService extends BaseService {

  /**
   * Account URL for Azure Blob Storage account. Depends on `storageAccountName` being set in baseService
   */
  private accountUrl: string;
  private authType: AzureStorageAuthType;
  private storageCredential: SharedKeyCredential|TokenCredential;

  public constructor(serverless: Serverless, options: Serverless.Options,
    authType: AzureStorageAuthType = AzureStorageAuthType.SharedKey) {
    super(serverless, options);
    this.accountUrl = `https://${this.storageAccountName}.blob.core.windows.net`;
    this.authType = authType;
  }

  /**
   * Initialize Blob Storage service. This creates the credentials required
   * to perform any operation with the service
   */
  public async initialize() {
    if (this.storageCredential) {
      return;
    }
    this.storageCredential = (this.authType === AzureStorageAuthType.SharedKey)
      ?
      new SharedKeyCredential(this.storageAccountName, await this.getKey())
      :
      new TokenCredential(await this.getToken());
  }

  /**
   * Upload a file to Azure Blob Storage
   * @param path Path of file to upload
   * @param containerName Name of container in Azure Blob storage for upload
   * @param blobName Name of blob file created as a result of upload
   */
  public async uploadFile(path: string, containerName: string, blobName?: string) {
    Guard.empty(path, "path");
    Guard.empty(containerName, "containerName");
    this.checkInitialization();

    // Use specified blob name or replace `/` in path with `-`
    const name = blobName || path.replace(/^.*[\\\/]/, "-");
    this.log(`Uploading file at '${path}' to container '${containerName}' with name '${name}'`)
    await uploadFileToBlockBlob(Aborter.none, path, this.getBlockBlobURL(containerName, name));
    this.log("Finished uploading blob");
  };

  /**
   * Download blob to file
   * https://github.com/Azure/azure-storage-js/blob/master/blob/samples/highlevel.sample.js#L82-L97
   * @param containerName Container containing blob to download
   * @param blobName Blob to download
   * @param targetPath Path to which blob will be downloaded
   */
  public async downloadBinary(containerName: string, blobName: string, targetPath: string) {
    const blockBlobUrl = this.getBlockBlobURL(containerName, blobName);
    const props = await blockBlobUrl.getProperties(Aborter.none);
    const buffer = Buffer.alloc(props.contentLength);
    await downloadBlobToBuffer(
      Aborter.timeout(30 * 60 * 1000),
      buffer,
      blockBlobUrl,
      0,
      undefined,
      {
        blockSize: 4 * 1024 * 1024, // 4MB block size
        parallelism: 20, // 20 concurrency
      }
    );
    fs.writeFileSync(targetPath, buffer, "binary");
  }

  /**
   * Delete a blob from Azure Blob Storage
   * @param containerName Name of container containing blob
   * @param blobName Blob to delete
   */
  public async deleteFile(containerName: string, blobName: string): Promise<void> {
    Guard.empty(containerName, "containerName");
    Guard.empty(blobName, "blobName");
    this.checkInitialization();

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
    this.checkInitialization();

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
    this.checkInitialization();

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
  public async createContainerIfNotExists(containerName: string): Promise<void> {
    Guard.empty(containerName, "containerName");
    this.checkInitialization();

    const containers = await this.listContainers();
    if (!containers.find((name) => name === containerName)) {
      const containerURL = this.getContainerURL(containerName);
      await containerURL.create(Aborter.none);
    }
  }

  /**
   * Delete a container from Azure Blob Storage Account
   * @param containerName Name of container to delete
   */
  public async deleteContainer(containerName: string): Promise<void> {
    Guard.empty(containerName, "containerName");
    this.checkInitialization();

    const containerUrl = await this.getContainerURL(containerName)
    await containerUrl.delete(Aborter.none);
  }

  /**
   * Generate URL with SAS token for a specific blob
   * @param containerName Name of container containing blob
   * @param blobName Name of blob to generate SAS token for
   * @param days Number of days from current date until expiry of SAS token. Defaults to 1 year
   */
  public async generateBlobSasTokenUrl(containerName: string, blobName: string, days: number = 365): Promise<string> {
    this.checkInitialization();
    if (this.authType !== AzureStorageAuthType.SharedKey) {
      throw new Error("Need to authenticate with shared key in order to generate SAS tokens. " +
      "Initialize Blob Service with SharedKey auth type");
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + days);

    const blobSas = generateBlobSASQueryParameters({
      blobName,
      cacheControl: "cache-control-override",
      containerName,
      contentDisposition: "content-disposition-override",
      contentEncoding: "content-encoding-override",
      contentLanguage: "content-language-override",
      contentType: "content-type-override",
      expiryTime: endDate,
      ipRange: { start: "0.0.0.0", end: "255.255.255.255" },
      permissions: BlobSASPermissions.parse("racwd").toString(),
      protocol: SASProtocol.HTTPSandHTTP,
      startTime: now,
      version: "2016-05-31"
    },
    this.storageCredential as SharedKeyCredential);

    const blobUrl = this.getBlockBlobURL(containerName, blobName);
    return `${blobUrl.url}?${blobSas}`
  }

  /**
   * Get ServiceURL object for Azure Blob Storage Account
   */
  private getServiceURL(): ServiceURL {
    this.checkInitialization();

    const pipeline = StorageURL.newPipeline(this.storageCredential);
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
    Guard.empty(containerName, "containerName");
    this.checkInitialization();

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
    Guard.empty(containerName, "containerName");
    Guard.empty(blobName, "blobName");
    this.checkInitialization();

    return BlockBlobURL.fromContainerURL(
      this.getContainerURL(containerName),
      blobName,
    );
  }

  /**
   * Get access token by logging in (again) with a storage-specific context
   */
  private async getToken(): Promise<string> {
    const loginService = new AzureLoginService(this.serverless, this.options);
    const authResponse = await loginService.login({
      tokenAudience: "https://storage.azure.com/"
    });
    const token = await authResponse.credentials.getToken();
    return token.accessToken;
  }

  /**
   * Get access key for storage account
   */
  private async getKey(): Promise<string> {
    const context = new StorageManagementClientContext(this.credentials, this.subscriptionId)
    const storageAccounts = new StorageAccounts(context);
    const keys = await storageAccounts.listKeys(this.resourceGroup, this.storageAccountName);
    return keys.keys[0].value;
  }

  /**
   * Ensure that the blob storage service has been initialized. If not initialized,
   * the credentials will not be available for any operation
   */
  private checkInitialization() {
    Guard.null(this.storageCredential, "storageCredential",
      "Azure Blob Storage Service has not been initialized. Make sure .initialize() has been called " +
      "before performing any operation");
  }
}
