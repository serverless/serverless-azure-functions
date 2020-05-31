import fs from "fs";
import Serverless from "serverless";
import { BaseService } from "./baseService";
import { PackageService } from "./packageService";
import { getRuntimeLanguage, isCompiledRuntime, BuildMode, getFunctionWorkerRuntime } from "../config/runtime";
import { Utils } from "../shared/utils";
import { CompilerService } from "./compilerService";
import { constants } from "../shared/constants";
import path from "path";

export class OfflineService extends BaseService {

  private packageService: PackageService;

  private localFiles = {
    "local.settings.json": JSON.stringify({
      IsEncrypted: false,
      Values: {
        AzureWebJobsStorage: "UseDevelopmentStorage=true",
        FUNCTIONS_WORKER_RUNTIME: getFunctionWorkerRuntime(this.config.provider.runtime),
      }
    }),
  }

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options, false);
    this.packageService = new PackageService(serverless, options);
  }

  public async build() {
    this.log("Building offline service");
    await this.packageService.createBindings(true);
    if (isCompiledRuntime(this.config.provider.runtime)) {
      const compilerService = new CompilerService(this.serverless, this.options);
      await compilerService.build(BuildMode.DEBUG);
    }
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
    this.log("Finished cleaning up offline files");
  }

  /**
   * Spawn `func host start` from core func tools
   */
  public async start() {
    const additionalArgs: string = this.getOption("spawnargs");
    const { command, args } = this.configService.getCommand("start");
    const cwd = isCompiledRuntime(this.config.provider.runtime)
      ? path.join(this.serverless.config.servicePath, constants.tmpBuildDir)
      : undefined;
    this.log(cwd);
    await Utils.spawnLocal({
      serverless: this.serverless,
      command: command,
      cwd,
      commandArgs: (additionalArgs) ? args.concat(additionalArgs.split(" ")) : args,
      onSigInt: async () => {
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
      }
    });
  }
}
