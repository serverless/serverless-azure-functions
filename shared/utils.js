'use strict';

const constants = {
  type: 'type',
  direction: 'direction',
  trigger: 'Trigger',
  inDirection: 'in',
  outDirection: 'out',
  settings: 'settings',
  name: 'name',
  value: 'value',
  resource: 'resource',
  required: 'required',
  storage: 'storage',
  connection: 'connection',
  enum: 'enum',
  defaultValue: 'defaultValue',
  webHookType: 'webHookType',
  httpTrigger: 'httpTrigger',
  queue: 'queue',
  queueName: 'queueName',
  displayName: 'displayName',
  xAzureSettings: 'x-azure-settings',
  entryPoint: 'entryPoint'
};

module.exports = {
  'getFunctionMetaData': function (functionName, parsedBindings, serverless) {
    const bindings = [];
    let bindingSettingsNames = [];
    let bindingSettings = [];
    let bindingUserSettings = {};
    let bindingType;
    const functionsJson = { disabled: false, bindings: [] };
    const functionObject = serverless.service.getFunction(functionName);
    const handler = functionObject.handler;
    const events = functionObject.events;
    const params = {};

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
      const bindingUserSettingsMetaData = this.getBindingUserSettingsMetaData(azureSettings, bindingType, bindingTypeIndex, bindingDisplayNames);

      bindingTypeIndex = bindingUserSettingsMetaData.index;
      bindingUserSettings = bindingUserSettingsMetaData.userSettings;

      if (bindingType.includes(constants.queue) && functionObject.events[eventsIndex].queue) {
        bindingUserSettings[constants.queueName] = functionObject.events[eventsIndex].queue;
      }

      if (bindingTypeIndex < 0) {
        throw new Error('Binding not supported');
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

      bindings.push(this.getBinding(bindingType, bindingSettings, bindingUserSettings, serverless));
    }

    if (bindingType === constants.httpTrigger) {
      bindings.push(this.getHttpOutBinding(bindingUserSettings));
    }

    functionsJson.bindings = bindings;
    params.functionsJson = functionsJson;

    const entryPointAndHandlerPath = this.getEntryPointAndHandlerPath(handler);
    if( functionObject.scriptFile ){
      entryPointAndHandlerPath.handlerPath = functionObject.scriptFile;
    }
    const metaData = {
      entryPoint: entryPointAndHandlerPath[constants.entryPoint],
      handlerPath: entryPointAndHandlerPath.handlerPath,
      params: params
    };

    return metaData;
  },

  'getBindingUserSettingsMetaData': function (azureSettings, bindingType, bindingTypeIndex, bindingDisplayNames) {
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
  },

  'getEntryPointAndHandlerPath': function (handler) {
    let handlerPath = 'handler.js';
    let entryPoint = handler;
    const handlerSplit = handler.split('.');

    if (handlerSplit.length > 1) {
      entryPoint = handlerSplit[handlerSplit.length - 1];
      handlerPath = `${handler.substring(0, handler.lastIndexOf('.'))}.js`;
    }
    const metaData = {
      entryPoint: entryPoint,
      handlerPath: handlerPath
    };

    return metaData;
  },

  'getHttpOutBinding': function (bindingUserSettings) {
    const binding = {};

    binding[constants.type] = 'http';
    binding[constants.direction] = constants.outDirection;
    binding[constants.name] = '$return';
    if (bindingUserSettings[constants.webHookType]) {
      binding[constants.name] = 'res';
    }

    return binding;
  },

  'getBinding': function (bindingType, bindingSettings, bindingUserSettings) {
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
          binding[name] = 'AzureWebJobsStorage';
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
};
