import { relative } from "path";
import Serverless from "serverless";
import { ServerlessAzureFunctionConfig } from "../models/serverless";
import { BindingUtils } from "./bindings";
import { constants } from "./constants";

export interface FunctionMetadata {
  entryPoint: any;
  handlerPath: any;
  params: any;
}

export class Utils {
  public static getFunctionMetaData(functionName: string, serverless: Serverless): FunctionMetadata {
    const bindings = [];
    let bindingSettingsNames = [];
    let bindingSettings = [];
    let bindingUserSettings = {};
    let bindingType;
    const functionsJson = { disabled: false, bindings: [] };
    const functionObject = serverless.service.getFunction(functionName);
    const handler = functionObject.handler;
    const events = functionObject["events"];
    const params: any = {
      functionJson: null
    };

    const parsedBindings = BindingUtils.getBindingsMetaData(serverless);

    const bindingTypes = parsedBindings.bindingTypes;
    const bindingDisplayNames = parsedBindings.bindingDisplayNames;

    for (let eventsIndex = 0; eventsIndex < events.length; eventsIndex++) {
      bindingType = Object.keys(functionObject["events"][eventsIndex])[0];

      if (eventsIndex === 0) {
        bindingType += constants.trigger;
      }

      const index = bindingTypes.indexOf(bindingType);

      if (index < 0) {
        throw new Error(`Binding  ${bindingType} not supported`);
      }

      serverless.cli.log(`Building binding for function: ${functionName} event: ${bindingType}`);

      bindingUserSettings = {};
      const azureSettings = events[eventsIndex][constants.xAzureSettings];
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

    functionsJson.bindings = bindings;
    params.functionsJson = functionsJson;

    let { handlerPath, entryPoint } = Utils.getEntryPointAndHandlerPath(handler);
    if (functionObject["scriptFile"]) {
      handlerPath = functionObject["scriptFile"];
    }

    return {
      entryPoint,
      handlerPath: relative(functionName, handlerPath),
      params: params
    };
  }

  public static getEntryPointAndHandlerPath(handler: string) {
    let handlerPath = "handler.js";
    let entryPoint = handler;
    const handlerSplit = handler.split(".");

    if (handlerSplit.length > 1) {
      entryPoint = handlerSplit[handlerSplit.length - 1];
      handlerPath = `${handler.substring(0, handler.lastIndexOf("."))}.js`;
    }

    const metaData = {
      entryPoint: entryPoint,
      handlerPath: handlerPath
    };

    return metaData;
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
      const settings = event["x-azure-settings"]
      return settings && (!settings.direction || settings.direction === "in");
    });
  }

  public static getOutgoingBinding(functionConfig: ServerlessAzureFunctionConfig) {
    return functionConfig.events.find((event) => {
      const settings = event["x-azure-settings"]
      return settings && settings.direction === "out";
    });
  }

  /**
   * Runs an operation with auto retry policy
   * @param operation The operation to run
   * @param maxRetries The max number or retreis
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
}
