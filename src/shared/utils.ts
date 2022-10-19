import { relative, join } from "path";
import Serverless from "serverless";
import { ServerlessAzureConfig, ServerlessAzureFunctionConfig } from "../models/serverless";
import { BindingUtils } from "./bindings";
import { constants } from "./constants";
import { createInterface } from "readline"
import { SpawnOptions, StdioOptions } from "child_process";
import { spawn } from "cross-spawn"
import { getRuntimeLanguage } from "../config/runtime";

export interface FunctionMetadata {
  entryPoint: string;
  handlerPath: string;
  params: {
    functionJson: any;
  };
}

export interface ServerlessSpawnOptions {
  serverless: Serverless;
  command: string;
  commandArgs: string[];
  silent?: boolean;
  stdio?: StdioOptions;
  commandName?: string;
  cwd?: string;
  onSigInt?: () => void;
}

export class Utils {
  public static async getFunctionMetaData(functionName: string, serverless: Serverless, offlineMode: boolean = false): Promise<FunctionMetadata> {
    const config: ServerlessAzureConfig = serverless.service as any;
    const bindings = [];
    let bindingSettingsNames = [];
    let bindingSettings = [];
    let bindingUserSettings = {};
    let bindingType;
    const functionJson = { disabled: false, bindings: [] };
    const functionObject = serverless.service.getFunction(functionName);
    const handler = functionObject.handler;
    const events = functionObject["events"];
    const params: any = {
      functionJson: null
    };

    const parsedBindings = await BindingUtils.getBindingsMetaData(serverless);

    const bindingTypes = parsedBindings.bindingTypes;
    const bindingDisplayNames = parsedBindings.bindingDisplayNames;

    for (let eventsIndex = 0; eventsIndex < events.length; eventsIndex++) {
      bindingType = Object.keys(functionObject["events"][eventsIndex])[0];

      // Durable Functions triggers have "trigger" part in the by default, so we do not need
      // to add "trigger" part here.
      if (eventsIndex === 0 && !constants.durableFunctionTriggers.includes(bindingType)) {
        bindingType += constants.trigger;
      }

      const index = bindingTypes.indexOf(bindingType);

      if (index < 0) {
        throw new Error(`Binding  ${bindingType} not supported`);
      }

      serverless.cli.log(`Building binding for function: ${functionName} event: ${bindingType}`);

      bindingUserSettings = {};

      // Merges both the event and event.x-azure-settings for backwards compatibility
      // Prefers the event and will override anything in x-azure-settings
      const azureSettings = {
        ...events[eventsIndex][constants.xAzureSettings],
        ...events[eventsIndex]
      };
      let bindingTypeIndex = bindingTypes.indexOf(bindingType);
      const bindingUserSettingsMetaData = BindingUtils.getBindingUserSettingsMetaData(azureSettings, bindingType, bindingTypeIndex, bindingDisplayNames);

      bindingTypeIndex = bindingUserSettingsMetaData.index;
      bindingUserSettings = bindingUserSettingsMetaData.userSettings;

      if (bindingType.includes(constants.queue) && functionObject["events"][eventsIndex].queue) {
        bindingUserSettings[constants.queueName] = functionObject["events"][eventsIndex].queue;
      }

      if (bindingTypeIndex < 0) {
        throw new Error("Binding not supported");
      }

      bindingSettings = parsedBindings.bindingSettings[bindingTypeIndex];
      bindingSettingsNames = parsedBindings.bindingSettingsNames[bindingTypeIndex];

      if (azureSettings) {
        for (let azureSettingKeyIndex = 0; azureSettingKeyIndex < Object.keys(azureSettings).length; azureSettingKeyIndex++) {
          const key = Object.keys(azureSettings)[azureSettingKeyIndex];

          if (bindingSettingsNames.indexOf(key) >= 0) {
            bindingUserSettings[key] = azureSettings[key];
          }
        }
      }

      bindings.push(BindingUtils.getBinding(bindingType, bindingSettings, bindingUserSettings));
    }

    if (bindingType === constants.httpTrigger) {
      bindings.push(BindingUtils.getHttpOutBinding());
    }

    functionJson.bindings = bindings;
    params.functionJson = functionJson;

    let { handlerPath, entryPoint } = Utils.getEntryPointAndHandlerPath(handler, config);

    if (functionObject["scriptFile"]) {
      handlerPath = functionObject["scriptFile"];
    }

    if (offlineMode && config.plugins && config.plugins.includes("serverless-webpack")) {
      handlerPath = join(".webpack", "service", handlerPath)
    }

    return {
      entryPoint,
      handlerPath: relative(functionName, handlerPath).replace(/\\/g, "/"),
      params: params
    };
  }

  public static getEntryPointAndHandlerPath(handler: string, config: ServerlessAzureConfig) {
    const handlerSplit = handler.split(".");

    const entryPoint = (handlerSplit.length > 1) ? handlerSplit[handlerSplit.length - 1] : undefined;

    const handlerPath = ((handlerSplit.length > 1) ? handlerSplit[0] : handler)
      + constants.runtimeExtensions[getRuntimeLanguage(config.provider.runtime)]

    return {
      entryPoint,
      handlerPath
    };
  }

  /**
   * Take the first `substringSize` characters from each string and return as one string
   * @param substringSize Size of substring to take from beginning of each string
   * @param args Strings to take substrings from
   */
  public static appendSubstrings(substringSize: number, ...args: string[]): string {
    let result = "";
    for (const s of args) {
      result += (s.substr(0, substringSize));
    }
    return result;
  }

  public static get(object: any, key: string, defaultValue?: any) {
    if (key in object) {
      return object[key];
    }
    return defaultValue
  }

  public static getTimestampFromName(name: string): string {
    const regex = /.*-t([0-9]+)/;
    const match = name.match(regex);
    if (!match || match.length < 2) {
      return null;
    }
    return match[1];
  }

  public static getIncomingBindingConfig(functionConfig: ServerlessAzureFunctionConfig) {
    return functionConfig.events.find((event) => {
      const settings = Utils.get(event, constants.xAzureSettings, event);
      return settings && (!settings.direction || settings.direction === "in");
    });
  }

  public static getOutgoingBindingConfig(functionConfig: ServerlessAzureFunctionConfig) {
    return functionConfig.events.find((event) => {
      const settings = Utils.get(event, constants.xAzureSettings, event);
      return settings && settings.direction === "out";
    });
  }

  /**
   * Runs an operation with auto retry policy
   * @param operation The operation to run
   * @param maxRetries The max number of retries
   * @param retryWaitInterval The time to wait between retries
   */
  public static async runWithRetry<T>(operation: (retry?: number) => Promise<T>, maxRetries: number = 3, retryWaitInterval: number = 1000) {
    let retry = 0;
    let error = null;

    while (retry < maxRetries) {
      try {
        retry++;
        return await operation(retry);
      }
      catch (e) {
        error = e;
      }

      await Utils.wait(retryWaitInterval);
    }

    return Promise.reject(error);
  }

  /**
   * Waits for the specified amount of time.
   * @param time The amount of time to wait (default = 1000ms)
   */
  public static wait(time: number = 1000) {
    return new Promise((resolve) => {
      setTimeout(resolve, time);
    });
  }

  /**
   * Wait for user input and return it
   */
  public static async waitForUserInput(): Promise<string> {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question("", (answer: string) => {
        rl.close();
        resolve(answer);
      })
    });
  }

  /*
   * Spawn a Node child process from executable within node_modules/.bin
   * @param command CLI Command - NO ARGS
   * @param spawnArgs Array of arguments for CLI command
   */
  public static spawnLocal(options: ServerlessSpawnOptions): Promise<void> {
    const { serverless, command } = options;
    const localCommand = join(
      serverless.config.servicePath,
      "node_modules",
      ".bin",
      command
    );
    return this.spawn({
      ...options,
      command: localCommand,
      commandName: command,
    });
  }

  // public static spawn()

  public static spawn(options: ServerlessSpawnOptions): Promise<void> {
    const {
      command,
      serverless,
      commandArgs,
      onSigInt,
      commandName,
      stdio,
      cwd,
    } = options;

    const env = {
      // Inherit environment from current process, most importantly, the PATH
      ...process.env,
      // Environment variables from serverless config are king
      ...serverless.service.provider["environment"],
    }
    if (!options.silent) {
      serverless.cli.log(`Spawning process '${commandName || command} ${commandArgs.join(" ")}'`);
    }
    return new Promise(async (resolve, reject) => {
      const spawnOptions: SpawnOptions = {
        env,
        stdio: stdio || "inherit",
        cwd: cwd
      };

      const childProcess = spawn(command, commandArgs, spawnOptions);

      if (onSigInt) {
        process.on("SIGINT", onSigInt);
      }

      childProcess.on("exit", (code, signal) => {
        if (code === 0) {
          resolve();
        } else {
          serverless.cli.log("Got an exit")
          reject(`${code} ${signal}`);
        }
      });
    });
  }
}
