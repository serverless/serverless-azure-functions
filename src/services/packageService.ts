import fs from "fs";
import path from "path";
import rimraf from "rimraf";
import Serverless from "serverless";
import { constants } from "../shared/constants";
import { FunctionMetadata, Utils } from "../shared/utils";
import { BaseService } from "./baseService";

/**
 * Adds service packing support
 */
export class PackageService extends BaseService {
  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options, false);
  }

  public cleanUpServerlessDir() {
    const serverlessDir = path.join(this.serverless.config.servicePath, ".serverless");
    if (fs.existsSync(serverlessDir)) {
      this.log("Removing .serverless directory")
      rimraf.sync(serverlessDir);
    }
  }

  /**
   * Creates the function.json binding files required for the serverless service
   */
  public async createBindings(offlineMode: boolean = false): Promise<void> {
    const createEventsPromises = this.serverless.service.getAllFunctions()
      .map(async (functionName) => {
        const metaData = await Utils.getFunctionMetaData(functionName, this.serverless, offlineMode);
        return this.createBinding(functionName, metaData);
      });
    await Promise.all(createEventsPromises);
  }

  /**
   * Prepares a serverless project for webpack and copies required files including
   * host.json and function.json files
   */
  public prepareWebpack() {
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

    this.log("Copying files for webpack");
    filesToCopy.forEach((filePath) => {
      const destinationPath = path.join(".webpack", "service", filePath);
      const destinationDirectory = path.dirname(destinationPath);
      if (!fs.existsSync(destinationDirectory)) {
        fs.mkdirSync(destinationDirectory);
      }
      fs.copyFileSync(filePath, destinationPath);
      this.log(`-> ${destinationPath}`);
    });

    return Promise.resolve();
  }

  /**
   * Cleans up generated function.json files after packaging has completed
   */
  public cleanUp() {
    const functionFilesToRemove = [
      "function.json",
    ];

    const functionFoldersToRemove = [
      "__pycache__"
    ]

    const rootFilesToRemove = [
      ".funcignore"
    ]

    const rootFoldersToRemove = [
      constants.tmpBuildDir,
      "bin",
      "obj",
    ]

    this.serverless.service.getAllFunctions().map((functionName) => {
      // Delete function.json if exists in function folder

      // Delete function folder if exists and empty
      if (!fs.existsSync(functionName)) {
        return;
      }

      functionFilesToRemove.forEach((fileToRemove) => {
        const filePath = path.join(functionName, fileToRemove);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

      functionFoldersToRemove.forEach((folderToRemove) => {
        const folderPath = path.join(functionName, folderToRemove);
        if (fs.existsSync(folderPath)) {
          rimraf.sync(folderPath);
        }
      });

      // Delete function folder if empty
      const items = fs.readdirSync(functionName);
      if (items.length === 0) {
        fs.rmdirSync(functionName);
      }
    });

    for (const file of rootFilesToRemove) {
      const filePath = path.join(this.serverless.config.servicePath, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    for (const dir of rootFoldersToRemove) {
      const dirPath = path.join(this.serverless.config.servicePath, dir);
      if (fs.existsSync(dirPath)) {
        rimraf.sync(dirPath);
      }
    }

    return Promise.resolve();
  }

  /**
   * Creates the function.json for for the specified function
   */
  public createBinding(functionName: string, functionMetadata: FunctionMetadata) {
    const functionJSON = this.getFunctionJson(functionName, functionMetadata);
    const functionDirPath = this.makeFunctionDir(functionName);

    fs.writeFileSync(path.join(functionDirPath, "function.json"), this.stringify(functionJSON));
    return Promise.resolve();
  }

  private getFunctionJson(functionName: string, functionMetadata: FunctionMetadata) {
    const functionJSON = functionMetadata.params.functionJson;
    const { entryPoint, handlerPath } = functionMetadata;
    functionJSON.entryPoint = entryPoint;
    if (this.configService.isPythonTarget()) {
      const index = (functionJSON.bindings as any[])
        .findIndex((binding) => (!binding.direction || binding.direction === "out"));

      if (functionJSON.bindings[index]) {
        functionJSON.bindings[index].name = "$return";
      }
    }
    functionJSON.scriptFile = handlerPath;

    const functionObject = this.configService.getFunctionConfig()[functionName];
    const incomingBinding = Utils.getIncomingBindingConfig(functionObject);

    const bindingAzureSettings = Utils.get(incomingBinding, constants.xAzureSettings, incomingBinding);

    if (bindingAzureSettings.route) {
      // Find incoming binding within functionJSON and set the route
      const index = (functionJSON.bindings as any[])
        .findIndex((binding) => (!binding.direction || binding.direction === "in"));

      if (functionJSON.bindings[index]) {
        functionJSON.bindings[index].route = bindingAzureSettings.route;
      }
    }

    return functionJSON;
  }

  private makeFunctionDir(functionName: string) {
    const functionDirPath = path.join(this.serverless.config.servicePath, functionName);
    if (!fs.existsSync(functionDirPath)) {
      fs.mkdirSync(functionDirPath);
    }
    return functionDirPath;
  }
}
