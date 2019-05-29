import fs from 'fs';
import mock from 'mock-fs';
import rimraf from 'rimraf';
import { MockFactory } from '../../../test/mockFactory';
import { invokeHook } from "../../../test/utils";
import { AzureFuncRemovePlugin } from './azureFuncRemove';

describe('Azure Func Add', () => {

  const writeFileSpy = jest.spyOn(fs, 'writeFileSync');
  const rimrafSpy = jest.spyOn(rimraf, 'sync');

  beforeAll(() => {
    mock({
      'function1': {
        'index.js': 'contents',
        'function.json': 'contents',
      },
      'serverless.yml': MockFactory.createTestServerlessYml(true)
    }, {createCwd: true, createTmp: true});    
  });

  afterAll(() => {
    mock.restore();
  })

  it('returns with missing name', async () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureFuncRemovePlugin(sls, options);
    await invokeHook(plugin, 'func:remove:remove');
    expect(sls.cli.log).toBeCalledWith('Need to provide a name of function to remove')
  });

  it('returns with pre-existing function', async () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    options['name'] = 'myNonExistingFunction';
    const plugin = new AzureFuncRemovePlugin(sls, options);
    await invokeHook(plugin, 'func:remove:remove');
    expect(sls.cli.log).toBeCalledWith(`Function myNonExistingFunction does not exist`);
  });

  it('deletes directory and updates serverless.yml', async () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureFuncRemovePlugin(sls, options);
    const functionName = 'function1';
    options['name'] = functionName;
    await invokeHook(plugin, 'func:remove:remove');
    expect(rimrafSpy).toBeCalledWith(functionName);
    const expectedFunctionsYml = MockFactory.createTestFunctionsMetadata();
    delete expectedFunctionsYml[functionName];
    expect(writeFileSpy).toBeCalledWith('serverless.yml', MockFactory.createTestServerlessYml(true, expectedFunctionsYml))
  });
});