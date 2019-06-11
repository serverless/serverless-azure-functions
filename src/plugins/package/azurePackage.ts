
import Serverless from "serverless";
import AzureProvider from "../../provider/azureProvider";
import { BindingUtils } from "../../shared/bindings";
import { Utils } from "../../shared/utils";
import fs from "fs";
import path from "path";

export class AzurePackage {
  private bindingsCreated: boolean = false;
  public provider: AzureProvider;
  public hooks: { [eventName: string]: Promise<any> };

  public constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      "before:package:setupProviderConfiguration": this.setupProviderConfiguration.bind(this),
      "before:webpack:package:packageModules": this.webpack.bind(this),
      "after:package:finalize": this.finalize.bind(this),
    };
  }

  private async setupProviderConfiguration(): Promise<any[]> {
    this.serverless.cli.log("Building Azure Events Hooks");

    const createEventsPromises = this.serverless.service.getAllFunctions()
      .map((functionName) => {
        const metaData = Utils.getFunctionMetaData(functionName, this.serverless);
        return BindingUtils.createEventsBindings(this.serverless.config.servicePath, functionName, metaData);
      });

    this.bindingsCreated = true;

    return Promise.all(createEventsPromises);
  }

  private async webpack(): Promise<void> {
    if (!this.bindingsCreated) {
      await this.setupProviderConfiguration();
    }

    const filesToCopy: string[] = [];
    if (fs.existsSync("host.json")) {
      filesToCopy.push("host.json");
    }

    this.serverless.service.getAllFunctions().forEach((functionName) => {
      const functionJsonPath = path.join(functionName, "function.json");
      if (fs.existsSync(functionJsonPath)) {
        filesToCopy.push(functionJsonPath);
      }
    });

    this.serverless.cli.log("Copying files for webpack");
    filesToCopy.forEach((filePath) => {
      const destinationPath = path.join(".webpack", "service", filePath);
      const destinationDirectory = path.dirname(destinationPath);
      if (!fs.existsSync(destinationDirectory)) {
        fs.mkdirSync(destinationDirectory);
      }
      fs.copyFileSync(filePath, destinationPath);
      this.serverless.cli.log(`-> ${destinationPath}`);
    });

    return Promise.resolve();
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

  private wait(timeout: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, timeout);
    });
  }
}

