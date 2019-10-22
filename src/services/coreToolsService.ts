import Serverless from "serverless";
import { Utils } from "../shared/utils"
import configConstants from "../config";

export class CoreToolsService {
  public static async start(serverless: Serverless, onFinish: () => void, additionalArgs?: string[]) {
    const defaultArgs = configConstants.func.start;
    await Utils.spawn({
      serverless: serverless,
      command: configConstants.func.command,
      commandArgs: (additionalArgs) ? defaultArgs.concat(additionalArgs) : defaultArgs,
      onSigInt: onFinish
    });
  }

  public static async pack(serverless: Serverless) {
    await Utils.spawn({
      serverless: serverless,
      command: configConstants.func.command,
      commandArgs: configConstants.func.pack,
      stdio: "ignore"
    });
  }

  public static async publish(serverless: Serverless, functionAppName: string) {
    /**
     * This is where we would invoke the publish command from Azure Functions core tools.
     * Currently, it fails because it's not able to make a call to the Azure CLI from
     * within a child process. If we were to do it, it would look like:
     * 
       await Utils.spawn({
         serverless: serverless,
         command: configConstants.func.command,
         commandArgs: configConstants.func.publish.concat(functionAppName),
       });
     * 
     * As a workaround, we provide the exact command for users to run in order to publish
     * their function app and optionally clean up their workspace
     */
    const { func } = configConstants;
    serverless.cli.log(`Run command: \n\n ${func.command} ${func.publish
      .concat(functionAppName)
      .join(" ")} && sls offline cleanup\n\n`
    )
  }
}