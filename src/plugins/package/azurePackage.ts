
import Serverless from "serverless";
import AzureProvider from "../../provider/azureProvider";
import { BindingUtils } from "../../shared/bindings";
import { Utils } from "../../shared/utils";
import fs from "fs";
import path from "path";

export class AzurePackage {
  public provider: AzureProvider;
  public hooks: { [eventName: string]: Promise<any> };

  public constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      "package:setupProviderConfiguration": this.setupProviderConfiguration.bind(this),
      "package:finalize": this.finalize.bind(this),
    };
  }

  private async setupProviderConfiguration(): Promise<any[]> {
    this.serverless.cli.log("Building Azure Events Hooks");

    const createEventsPromises = this.serverless.service.getAllFunctions()
      .map((functionName) => {
        const metaData = Utils.getFunctionMetaData(functionName, this.serverless);

        return BindingUtils.createEventsBindings(this.serverless.config.servicePath, functionName, metaData);
      });

    return Promise.all(createEventsPromises);
  }

  /**
   * Cleans up generated folders & files after packaging is complete
   */
  private finalize(): Promise<void> {
    this.serverless.service.getAllFunctions().map((functionName) => {
      // Delete function.json if exists in function folder
      const filePath = path.join(functionName, "function.json");
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete function folder if empty
      const items = fs.readdirSync(functionName);
      if (items.length === 0) {
        fs.rmdirSync(functionName);
      }
    });

    return Promise.resolve();
  }
}

