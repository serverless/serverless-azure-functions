import { spawn, SpawnOptions } from "child_process";
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
      if (!fs.existsSync(filename)) {
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
      if (fs.existsSync(filename)) {
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
   * @param spawnArgs Array of arguments for CLI command
   */
  private spawn(command: string, spawnArgs?: string[]): Promise<void> {
    if (process.platform === "win32") {
      command += ".cmd";
    }

    const env = {
      // Inherit environment from current process, most importantly, the PATH
      ...process.env,
      // Environment variables from serverless config are king
      ...this.serverless.service.provider["environment"],
    }
    this.log(`Spawning process '${command} ${spawnArgs.join(" ")}'`);
    return new Promise(async (resolve, reject) => {
      const spawnOptions: SpawnOptions = { env, stdio: "inherit" };
      const childProcess = spawn(command, spawnArgs, spawnOptions);

      process.on("SIGINT", async () => {
        try {
          if (this.getOption("nocleanup")) {
            this.log("Skipping offline file cleanup...");
          } else {
            await this.cleanup();
          }
        } catch {
          // Swallowing `scandir` error that gets thrown after
          // trying to remove the same directory twice
        } finally {
          process.exit();
        }
      });

      childProcess.on("exit", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject();
        }
      });
    });
  }
}
