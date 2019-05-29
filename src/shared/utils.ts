import { BindingUtils } from "./bindings";
import { constants } from "./constants";

export interface FunctionMetadata {
  entryPoint: any;
  handlerPath: any;
  params: any;
}

export class Utils {
  public static getFunctionMetaData(functionName: string, serverless): FunctionMetadata {
    const bindings = [];
    let bindingSettingsNames = [];
    let bindingSettings = [];
    let bindingUserSettings = {};
    let bindingType;
    const functionsJson = { disabled: false, bindings: [] };
    const functionObject = serverless.service.getFunction(functionName);
    const handler = functionObject.handler;
    const events = functionObject.events;
    const params: any = {
      functionJson: null
    };
  
    const parsedBindings = BindingUtils.getBindingsMetaData(serverless);
  
    const bindingTypes = parsedBindings.bindingTypes;
    const bindingDisplayNames = parsedBindings.bindingDisplayNames;
  
    for (let eventsIndex = 0; eventsIndex < events.length; eventsIndex++) {
      bindingType = Object.keys(functionObject.events[eventsIndex])[0];
  
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
  
      if (bindingType.includes(constants.queue) && functionObject.events[eventsIndex].queue) {
        bindingUserSettings[constants.queueName] = functionObject.events[eventsIndex].queue;
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
      bindings.push(BindingUtils.getHttpOutBinding(bindingUserSettings));
    }
  
    functionsJson.bindings = bindings;
    params.functionsJson = functionsJson;
  
    const entryPointAndHandlerPath = Utils.getEntryPointAndHandlerPath(handler);
    if (functionObject.scriptFile) {
      entryPointAndHandlerPath.handlerPath = functionObject.scriptFile;
    }
    const metaData = {
      entryPoint: entryPointAndHandlerPath[constants.entryPoint],
      handlerPath: entryPointAndHandlerPath.handlerPath,
      params: params
    };
  
    return metaData;
  }

  public static getEntryPointAndHandlerPath(handler) {
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
}
