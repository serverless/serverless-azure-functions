import Serverless from "serverless";
import { BaseService } from "./baseService";
import { PackageService } from "./packageService";

export class OfflineService extends BaseService {

  private packageService: PackageService;
  
  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options, false);
    this.packageService = new PackageService(serverless);
  }

  public async build() {
    this.log("Building offline service");
    await this.packageService.createBindings();
    this.log("Finished building offline service");
  }

  public async cleanup() {
    await this.packageService.cleanUp();
  }

  public start() {
    this.log("Run 'npm start' or 'func host start' to run service locally");
    this.log("Make sure you have Azure Functions Core Tools installed");
    this.log("If not installed run 'npm i azure-functions-core-tools -g")
  }
}