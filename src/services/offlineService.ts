import Serverless from "serverless";
import { BindingUtils } from "../shared/bindings";
import { Utils } from "../shared/utils";
import { BaseService } from "./baseService";

export class OfflineService extends BaseService {
  
  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options, false);
  }

  public async build() {
    this.log("Building offline service");
    const createEventsPromises = this.serverless.service.getAllFunctions()
      .map((functionName) => {
        this.log(`Building function ${functionName}`);
        const metaData = Utils.getFunctionMetaData(functionName, this.serverless);
        return BindingUtils.createEventsBindings(this.serverless, functionName, metaData);
      });
    await Promise.all(createEventsPromises);
    this.log("Finished building offline service");
  }

  public start() {
    this.log("Run 'npm start' or 'func host start' to run service locally");
    this.log("Make sure you have Azure Functions Core Tools installed");
    this.log("If not installed run 'npm i azure-functions-core-tools -g")
  }
}