import { writeFileSync } from 'fs';
import { join } from 'path';
import { FunctionMetadata } from './utils';
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

  return {
    bindingDisplayNames: bindingDisplayNames,
    bindingTypes: bindingTypes,
    bindingSettings: bindingSettings,
    bindingSettingsNames: bindingSettingsNames
  };
}

export async function createEventsBindings(servicePath: string, functionName: string, functionMetadata: FunctionMetadata): Promise<any> {
  const functionJSON = functionMetadata.params.functionsJson;
  functionJSON.entryPoint = functionMetadata.entryPoint;
  functionJSON.scriptFile = functionMetadata.handlerPath;
  writeFileSync(join(servicePath, functionName, 'function.json'), JSON.stringify(functionJSON, null, 4));
  return Promise.resolve();
}