import { writeFileSync, existsSync, mkdirSync, mkdir } from "fs";
import { join } from "path";
import Serverless from "serverless";
import { FunctionMetadata } from "./utils";
import { constants } from "./constants";

const bindingsJson = require("./bindings.json"); // eslint-disable-line @typescript-eslint/no-var-requires

export class BindingUtils {
  public static getBindingsMetaData(serverless: Serverless) {
    const bindingDisplayNames = [];
    const bindingTypes = [];
    const bindingSettings = [];
    const bindingSettingsNames = [];

    serverless.cli.log("Parsing Azure Functions Bindings.json...");

    for (let bindingsIndex = 0; bindingsIndex < bindingsJson[constants.bindings].length; bindingsIndex++) {
      const settingsNames = [];

      bindingTypes.push(bindingsJson[constants.bindings][bindingsIndex][constants.type]);
      bindingDisplayNames.push(bindingsJson[constants.bindings][bindingsIndex][constants.displayName].toLowerCase());
      bindingSettings[bindingsIndex] = bindingsJson[constants.bindings][bindingsIndex][constants.settings];

      for (let bindingSettingsIndex = 0; bindingSettingsIndex < bindingSettings[bindingsIndex].length; bindingSettingsIndex++) {
        settingsNames.push(bindingSettings[bindingsIndex][bindingSettingsIndex][constants.name]);
      }

      bindingSettingsNames[bindingsIndex] = settingsNames;
    }

    return {
      bindingDisplayNames: bindingDisplayNames,
      bindingTypes: bindingTypes,
      bindingSettings: bindingSettings,
      bindingSettingsNames: bindingSettingsNames
    };
  }

  public static createEventsBindings(servicePath: string, functionName: string, functionMetadata: FunctionMetadata): Promise<any> {
    const functionJSON = functionMetadata.params.functionsJson;
    functionJSON.entryPoint = functionMetadata.entryPoint;
    functionJSON.scriptFile = functionMetadata.handlerPath;

    const functionDirPath = join(servicePath, functionName);
    if (!existsSync(functionDirPath)) {
      mkdirSync(functionDirPath);
    }

    writeFileSync(join(functionDirPath, "function.json"), JSON.stringify(functionJSON, null, 2));

    return Promise.resolve();
  }

  public static getBindingUserSettingsMetaData(azureSettings, bindingType, bindingTypeIndex, bindingDisplayNames) {
    let bindingDisplayNamesIndex = bindingTypeIndex;
    const bindingUserSettings = {};

    if (azureSettings) {
      const directionIndex = Object.keys(azureSettings).indexOf(constants.direction);

      if (directionIndex >= 0) {
        const key = Object.keys(azureSettings)[directionIndex];
        const displayName = `$${bindingType}${azureSettings[key]}_displayName`;

        bindingDisplayNamesIndex = bindingDisplayNames.indexOf(displayName.toLowerCase());
        bindingUserSettings[constants.direction] = azureSettings[key];
      }
    }
    const bindingUserSettingsMetaData = {
      index: bindingDisplayNamesIndex,
      userSettings: bindingUserSettings
    };

    return bindingUserSettingsMetaData;
  }

  public static getHttpOutBinding(bindingUserSettings) {
    const binding = {};

    binding[constants.type] = "http";
    binding[constants.direction] = constants.outDirection;
    binding[constants.name] = "$return";
    if (bindingUserSettings[constants.webHookType]) {
      binding[constants.name] = "res";
    }

    return binding;
  }

  public static getBinding(bindingType, bindingSettings, bindingUserSettings) {
    const binding = {};

    binding[constants.type] = bindingType;
    if (bindingUserSettings && bindingUserSettings[constants.direction]) {
      binding[constants.direction] = bindingUserSettings[constants.direction];
    } else if (bindingType.includes(constants.trigger)) {
      binding[constants.direction] = constants.inDirection;
    } else {
      binding[constants.direction] = constants.outDirection;
    }

    for (let bindingSettingsIndex = 0; bindingSettingsIndex < bindingSettings.length; bindingSettingsIndex++) {
      const name = bindingSettings[bindingSettingsIndex][constants.name];

      if (bindingUserSettings && bindingUserSettings[name] !== undefined && bindingUserSettings[name] !== null) {
        binding[name] = bindingUserSettings[name];
        continue;
      }
      const value = bindingSettings[bindingSettingsIndex][constants.value];
      const required = bindingSettings[bindingSettingsIndex][constants.required];
      const resource = bindingSettings[bindingSettingsIndex][constants.resource];

      if (required) {
        const defaultValue = bindingSettings[bindingSettingsIndex][constants.defaultValue];

        if (defaultValue) {
          binding[name] = defaultValue;
        } else if (name === constants.connection && resource.toLowerCase() === constants.storage) {
          binding[name] = "AzureWebJobsStorage";
        } else {
          throw new Error(`Required property ${name} is missing for binding:${bindingType}`);
        }
      }

      if (value === constants.enum && name !== constants.webHookType) {
        const enumValues = bindingSettings[bindingSettingsIndex][constants.enum];

        binding[name] = enumValues[0][constants.value];
      }
    }

    return binding;
  }

}
