import Serverless from "serverless";
import { Utils } from "../shared/utils"
import { configConstants } from "../config/constants";

/**
 * Wrapper for azure-functions-core-tools commands. Was originally used heavily
 * to pack and publish function apps as a workaround for remote build, but since
 * that is working now, we don't need those functionalities. Keeping `start`
 * functionality as it is still used and is a good abstraction away from the
 * offline plugin.
 */
export class CoreToolsService {

  /**
   * Wrapper method for `func host start`
   * @param serverless Serverless instance
   * @param onFinish Function to run on finish
   * @param additionalArgs Additional arguments to core tools start
   */
  public static async start(serverless: Serverless, onFinish: () => void, additionalArgs?: string[]) {
    const defaultArgs = configConstants.func.start;
    await Utils.spawn({
      serverless: serverless,
      command: configConstants.func.command,
      commandArgs: (additionalArgs) ? defaultArgs.concat(additionalArgs) : defaultArgs,
      onSigInt: onFinish
    });
  }
}