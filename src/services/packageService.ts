import fs from "fs";
import path from "path";
import rimraf from "rimraf";
import Serverless from "serverless";
import { FunctionMetadata, Utils } from "../shared/utils";
import { BaseService } from "./baseService";
import { SupportedRuntimeLanguage } from "../models/serverless";
import configConstants from "../config";
import { CoreToolsService } from "./coreToolsService";

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
  public async createBindings(): Promise<void> {
    const createEventsPromises = this.serverless.service.getAllFunctions()
      .map((functionName) => {
        const metaData = Utils.getFunctionMetaData(functionName, this.serverless);
        return this.createBinding(functionName, metaData);
      });
    this.generateFuncIgnore();

    await Promise.all(createEventsPromises);
  }

  public async createPackage() {
    this.log("Invoking core tools to build package...")

    await CoreToolsService.pack(this.serverless);
    
    const { servicePath } = this.serverless.config;
    const artifact = path.join(servicePath, path.basename(process.cwd()) + ".zip");
    const serverlessDir = path.join(servicePath, ".serverless")
    if (!fs.existsSync(serverlessDir)) {
      fs.mkdirSync(serverlessDir);
    }
    const artifactPath = path.join(serverlessDir, `${this.serviceName}.zip`);
    fs.renameSync(artifact, artifactPath);
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
   * Cleans up generated function.json files after packaging has completed
   */
  public cleanUp() {
    const functionFilesToRemove = [
      "function.json",
      "__init__.py"
    ];

    const functionFoldersToRemove = [
      "__pycache__"
    ]

    const rootFilesToRemove = [
      ".funcignore"
    ]

    this.serverless.service.getAllFunctions().map((functionName) => {
      // Delete function.json if exists in function folder

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

    return Promise.resolve();
  }

  /**
   * Creates the function.json for for the specified function
   */
  public createBinding(functionName: string, functionMetadata: FunctionMetadata) {
    const functionJSON = this.getFunctionJson(functionName, functionMetadata);
    const functionDirPath = this.makeFunctionDir(functionName);

    fs.writeFileSync(path.join(functionDirPath, "function.json"), this.stringify(functionJSON));

    if (this.runtime.language === SupportedRuntimeLanguage.PYTHON) {
      fs.writeFileSync(path.join(functionDirPath, "__init__.py"), "");
    }
    return Promise.resolve();
  }

  private getFunctionJson(functionName: string, functionMetadata: FunctionMetadata) {
    const functionJSON = functionMetadata.params.functionJson;
    const { entryPoint, handlerPath } = functionMetadata;
    functionJSON.entryPoint = entryPoint;
    if (this.pythonTarget) {
      const index = (functionJSON.bindings as any[])
        .findIndex((binding) => (!binding.direction || binding.direction === "out"));
      functionJSON.bindings[index].name = "$return";
    } else {
    }
    functionJSON.scriptFile = handlerPath;

    const functionObject = this.configService.getFunctionConfig()[functionName];
    const bindingAzureSettings = Utils.getIncomingBindingConfig(functionObject)["x-azure-settings"];

    if (bindingAzureSettings.route) {
      // Find incoming binding within functionJSON and set the route
      const index = (functionJSON.bindings as any[])
        .findIndex((binding) => (!binding.direction || binding.direction === "in"));

      functionJSON.bindings[index].route = bindingAzureSettings.route;
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

  private generateFuncIgnore() {
    const exclude = this.config.package.exclude || []
    fs.writeFileSync(
      path.join(this.serverless.config.servicePath, ".funcignore"),
      exclude
        .concat(configConstants.defaultFuncIgnore)
        .concat([
          this.configService.getConfigFile()
        ])
        .join("\n")  
    )
  }
}
