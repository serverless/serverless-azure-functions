import { spawn } from "child_process";
import fs from "fs";
import Serverless from "serverless";
import configConstants from "../config";
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

  /**
   * Spawn `func host start` from core func tools
   */
  public async start() {
    await this.spawn(configConstants.funcCoreTools, configConstants.funcCoreToolsArgs);
  }

  /**
   * Spawn a Node child process with predefined environment variables
   * @param command CLI Command - NO ARGS
   * @param args Array of arguments for CLI command
   * @param env Additional environment variables to be set in addition to
   * predefined variables in `serverless.yml`
   */
  private spawn(command: string, args?: string[], env?: any): Promise<void> {
    env = {
      ...this.serverless.service.provider["environment"],
      ...env
    }
    this.log(`Spawning process '${command} ${args.join(" ")}'`);
    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, {env});

      childProcess.stdout.on("data", (data) => {
        this.log(data, {
          color: configConstants.funcConsoleColor,
        }, command);
      });

      childProcess.stderr.on("data", (data) => {
        this.log(data, {
          color: "red",
        }, command);
      })

      childProcess.on("message", (message) => {
        this.log(message, {
          color: configConstants.funcConsoleColor,
        }, command);
      });

      childProcess.on("error", (err) => {
        this.log(`${err}`, {
          color: "red"
        }, command);
        reject(err);
      });

      childProcess.on("exit", (code) => {
        this.log(`Exited with code: ${code}`, {
          color: (code === 0) ? "green" : "red",
        }, command);
      });

      childProcess.on("close", (code) => {
        this.log(`Closed with code: ${code}`, {
          color: (code === 0) ? "green" : "red",
        }, command);
        resolve();
      });

      childProcess.on("disconnect", () => {
        this.log("Process disconnected");
      });
    });
  }
}
