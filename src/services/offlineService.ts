import Serverless from "serverless";
import fs from "fs";
import { BaseService } from "./baseService";
import { PackageService } from "./packageService";

export class OfflineService extends BaseService {

  private packageService: PackageService;

  private localFiles = {
    "local.settings.json": JSON.stringify({
      IsEncrypted: false,
      Values: {
        AzureWebJobsStorage: "",
        FUNCTIONS_WORKER_RUNTIME: "node"
      }
    }),
  }

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options, false);
    this.packageService = new PackageService(serverless, options);
  }

  public async build() {
    this.log("Building offline service");
    await this.packageService.createBindings();
    const filenames = Object.keys(this.localFiles);
    for (const filename of filenames) {
      if (!fs.existsSync(filename)){
        fs.writeFileSync(
          filename,
          this.localFiles[filename]
        )
      }
    }
    this.log("Finished building offline service");
  }

  public async cleanup() {
    this.log("Cleaning up offline files")
    await this.packageService.cleanUp();
    const filenames = Object.keys(this.localFiles);
    for (const filename of filenames) {
      if (fs.existsSync(filename)){
        this.log(`Removing file '${filename}'`);
        fs.unlinkSync(filename)
      }
    }
    this.log("Finished cleaning up offline files");
  }

  public start() {
    this.log("Run 'npm start' or 'func host start' to run service locally");
    this.log("Make sure you have Azure Functions Core Tools installed");
    this.log("If not installed run 'npm i azure-functions-core-tools -g")
  }
}
