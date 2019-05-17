'use strict';

const path = require('path');

const bindingsJson = require(path.join(__dirname, 'bindings.json'));

const constants = {
  bindings: 'bindings',
  settings: 'settings',
  name: 'name',
  displayName: 'displayName',
  type: 'type'
};

module.exports = {
  getBindingsMetaData (serverless) {
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
};
