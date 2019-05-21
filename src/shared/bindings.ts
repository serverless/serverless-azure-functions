import { writeFileSync } from 'fs';
import { join } from 'path';
import * as Serverless from 'serverless';
import { IFunctionMetadata } from './utils';

const bindingsJson = require('./bindings.json');

const constants = {
  bindings: 'bindings',
  settings: 'settings',
  name: 'name',
  displayName: 'displayName',
  type: 'type'
};

export function getBindingsMetaData(serverless) {
  const bindingDisplayNames = [];
  const bindingTypes = [];
  const bindingSettings = [];
  const bindingSettingsNames = [];

  serverless.cli.log('Parsing Azure Functions Bindings.json...');

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

  const parsedBindings = {
    bindingDisplayNames: bindingDisplayNames,
    bindingTypes: bindingTypes,
    bindingSettings: bindingSettings,
    bindingSettingsNames: bindingSettingsNames
  };

  return parsedBindings;
}

export async function createEventsBindings(serverless: Serverless, functionName, functionMetadata: IFunctionMetadata): Promise<any> {
  const functionJSON = functionMetadata.params.functionsJson;
  functionJSON.entryPoint = functionMetadata.entryPoint;
  functionJSON.scriptFile = functionMetadata.handlerPath;
  writeFileSync(join(serverless.config.servicePath, functionName + '-function.json'), JSON.stringify(functionJSON, null, 4));
  return Promise.resolve();
}