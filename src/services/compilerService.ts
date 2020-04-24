import fs from "fs";
import path from "path";
import Serverless from "serverless";
import { promisify } from "util";
import zipFolder from "zip-folder";
import { BuildMode } from "../config/runtime";
import { constants } from "../shared/constants";
import { Utils } from "../shared/utils";
import { BaseService } from "./baseService";
const zip = promisify(zipFolder);

export class CompilerService extends BaseService {

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options, false);
  }
  
  public async build(mode: BuildMode) {
    const { runtime } = this.config.provider;
    const { command, args } = this.configService.getCompilerCommand(runtime, mode);

    // Spawn build process
    await Utils.spawn({
      serverless: this.serverless,
      command,
      commandArgs: args,
    });
    const cwd = process.cwd();

    // Create .serverless directory if it doesn't exist
    const serverlessDir = path.join(cwd, ".serverless")
    if (!fs.existsSync(serverlessDir)) {
      fs.mkdirSync(serverlessDir);
    }

    await zip(
      // Build directory
      path.join(process.cwd(), constants.tmpBuildDir),
      // Target .zip file
      path.join(serverlessDir, `${this.serviceName}.zip`)
    );    
  }
}
