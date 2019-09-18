import { relative } from "path";
import Serverless from "serverless";
import { FunctionBindingConfig } from "../models/functionApp";
import { ServerlessAzureFunctionConfig, ServerlessAzureFunctionBindingConfig } from "../models/serverless";
import { constants } from "../shared/constants";
import { BaseService } from "./baseService";
import bindingsJson from "../shared/bindings.json";

export interface FunctionMetadata {
  entryPoint: any;
  handlerPath: any;
  params: any;
}

export class FunctionBuildService extends BaseService {

  private bindingsMetadata: {
    bindingDisplayNames: any[];
    bindingTypes: any[];
    bindingSettings: any[];
    bindingSettingsNames: any[];
  }

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options, false);
    this.bindingsMetadata = this.getBindingsMetaData(serverless);
  }

  public getFunctionMetaData(functionName: string): FunctionMetadata {
    const functionConfig: ServerlessAzureFunctionConfig = this.serverless.service.getFunction(functionName) as any;

    let { handlerPath, entryPoint } = this.getEntryPointAndHandlerPath(functionConfig.handler);
    if (functionConfig.scriptFile) {
      handlerPath = functionConfig.scriptFile;
    }

    return {
      entryPoint,
      handlerPath: relative(functionName, handlerPath),
      params: {
        functionJson: {
          disabled: false,
          bindings: this.getBindings(functionName, functionConfig)
        }
      }
    };
  }

  public getEntryPointAndHandlerPath(handler: string) {
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

  public getIncomingBindingConfig(functionConfig: ServerlessAzureFunctionConfig) {
    return functionConfig.events.find((event) => {
      const settings = event["x-azure-settings"]
      return settings && (!settings.direction || settings.direction === "in");
    });
  }

  public getOutgoingBinding(functionConfig: ServerlessAzureFunctionConfig) {
    return functionConfig.events.find((event) => {
      const settings = event["x-azure-settings"]
      return settings && settings.direction === "out";
    });
  }

  public getBindingsMetaData(serverless: Serverless) {
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
      bindingDisplayNames,
      bindingTypes,
      bindingSettings,
      bindingSettingsNames
    };
  }

  public getBindingUserSettingsMetaData(azureSettings, bindingType, bindingTypeIndex, bindingDisplayNames) {
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

  public getHttpOutBinding() {
    const binding = {};

    binding[constants.type] = "http";
    binding[constants.direction] = constants.outDirection;
    binding[constants.name] = "res";

    return binding;
  }

  public getBinding(bindingType, bindingSettings, bindingUserSettings) {
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

  private getBindings(functionName: string, functionConfig: ServerlessAzureFunctionConfig): FunctionBindingConfig[] {
    const bindings: FunctionBindingConfig[] = [];

    let bindingType: string;
    const { bindingSettings, bindingSettingsNames, bindingTypes, bindingDisplayNames } = this.bindingsMetadata;

    for (let eventsIndex = 0; eventsIndex < functionConfig.events.length; eventsIndex++) {
      const event: ServerlessAzureFunctionBindingConfig = functionConfig.events[eventsIndex];

      const bindingType = this.getBindingType(event, eventsIndex);

      this.log(`Building binding for function: ${functionName} event: ${bindingType}`);

      const azureSettings = event["x-azure-settings"];

      let bindingTypeIndex = bindingTypes.indexOf(bindingType);
      const bindingUserSettingsMetaData = this.getBindingUserSettingsMetaData(
        azureSettings, bindingType, bindingTypeIndex, bindingDisplayNames);

      bindingTypeIndex = bindingUserSettingsMetaData.index;
      const bindingUserSettings = bindingUserSettingsMetaData.userSettings;

      if (bindingType.includes(constants.queue) && event.queue) {
        bindingUserSettings[constants.queueName] = event.queue;
      }

      if (bindingTypeIndex < 0) {
        throw new Error("Binding not supported");
      }

      const bindingTypeSettings = bindingSettings[bindingTypeIndex];
      const bindingTypeSettingsNames = bindingSettingsNames[bindingTypeIndex];

      if (azureSettings) {
        for (let azureSettingKeyIndex = 0; azureSettingKeyIndex < Object.keys(azureSettings).length; azureSettingKeyIndex++) {
          const key = Object.keys(azureSettings)[azureSettingKeyIndex];

          if (bindingTypeSettingsNames.indexOf(key) >= 0) {
            bindingUserSettings[key] = azureSettings[key];
          }
        }
      }

      bindings.push(this.getBinding(bindingType, bindingTypeSettings, bindingUserSettings));
    }

    if (bindingType === constants.httpTrigger) {
      bindings.push(this.getHttpOutBinding());
    }
    return bindings;
  }

  private getBindingType(event: ServerlessAzureFunctionBindingConfig, index: number) {
    let bindingType = Object.keys(event)[0];

    if (index === 0) {
      bindingType += constants.trigger;
    }

    if (this.bindingsMetadata.bindingTypes.indexOf(bindingType) < 0) {
      throw new Error(`Binding  ${bindingType} not supported`);
    }

    return bindingType;
  }
}