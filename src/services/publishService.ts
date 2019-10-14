import { Site } from "@azure/arm-appservice/esm/models";
import fs from "fs";
import Serverless from "serverless";
import configConstants from "../config";
import { FunctionAppOS } from "../models/serverless";
import { Guard } from "../shared/guard";
import { AzureBlobStorageService } from "./azureBlobStorageService";
import { BaseService } from "./baseService";
import { CoreToolsService } from "./coreToolsService";
import { FunctionAppService } from "./functionAppService";

export class PublishService extends BaseService {

  private blobService: AzureBlobStorageService;

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
    this.blobService = new AzureBlobStorageService(serverless, options);
  }

  public async publish(functionApp: Site, functionZipFile: string) {
    if (this.config.provider.os === FunctionAppOS.LINUX) {
      await this.linuxPublish(functionApp);
    } else {
      await this.windowsPublish(functionApp, functionZipFile);
    }
  }

  private async windowsPublish(functionApp: Site, functionZipFile: string) {
    const functionAppService = new FunctionAppService(this.serverless, this.options);
    
    this.log("Deploying serverless functions...");
    if (this.config.provider.deployment.external) {
      this.log("Updating function app setting to run from external package...");
      const sasUrl = await this.blobService.generateBlobSasTokenUrl(
        this.config.provider.deployment.container,
        this.artifactName
      );
      const response = await functionAppService.updateFunctionAppSetting(
        functionApp,
        configConstants.runFromPackageSetting,
        sasUrl
      );
      await functionAppService.syncTriggers(functionApp, response.properties);
    } else {
      await this.uploadZippedArtifactToFunctionApp(functionApp, functionZipFile);
    }

    this.log("Deployed serverless functions:")
    const serverlessFunctions = this.serverless.service.getAllFunctions();
    const deployedFunctions = await functionAppService.listFunctions(functionApp);

    // List functions that are part of the serverless yaml config
    deployedFunctions.forEach((functionConfig) => {
      if (serverlessFunctions.includes(functionConfig.name)) {
        const httpConfig = functionAppService.getFunctionHttpTriggerConfig(functionApp, functionConfig);

        if (httpConfig) {
          const method = httpConfig.methods[0].toUpperCase();
          this.log(`-> ${functionConfig.name}: [${method}] ${httpConfig.url}`);
        }
      }
    });
  }

  private async linuxPublish(functionApp: Site) {
    await CoreToolsService.publish(this.serverless, functionApp.name);
  }

  private async uploadZippedArtifactToFunctionApp(functionApp: Site, functionZipFile: string) {
    const scmDomain = this.getScmDomain(functionApp);

    this.log(`Deploying zip file to function app: ${functionApp.name}`);

    if (!(functionZipFile && fs.existsSync(functionZipFile))) {
      throw new Error("No zip file found for function app");
    }

    this.log(`-> Deploying service package @ ${functionZipFile}`);

    // https://github.com/projectkudu/kudu/wiki/Deploying-from-a-zip-file-or-url
    const requestOptions = {
      method: "POST",
      uri: `https://${scmDomain}/api/zipdeploy/`,
      json: true,
      headers: {
        Authorization: `Bearer ${await this.getAccessToken()}`,
        Accept: "*/*",
        ContentType: "application/octet-stream",
      }
    };

    await this.sendFile(requestOptions, functionZipFile);
    this.log("-> Function package uploaded successfully");
  }

  /**
   * Retrieves the SCM domain from the list of enabled domains within the app
   * Note: The SCM domain exposes additional API calls from the standard REST APIs.
   * @param functionApp The function app / web site
   */
  private getScmDomain(functionApp: Site) {
    return functionApp.enabledHostNames.find((hostName: string) => {
      return hostName.includes(".scm.") && hostName.endsWith(".azurewebsites.net");
    });
  }
}
