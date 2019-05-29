import fs from 'fs';
import mock from 'mock-fs';
import path from 'path';
import { MockFactory } from '../../../test/mockFactory';
import { invokeHook } from "../../../test/utils";
import { AzureFuncAddPlugin } from './azureFuncAdd';

describe('Azure Func Add', () => {

  beforeAll(() => {
    mock({
      'myExistingFunction': {
        'index.js': 'contents',
        'function.json': 'contents',
      },
      'serverless.yml': MockFactory.createTestServerlessYml(true)
    }, {createCwd: true, createTmp: true})
    fs.writeFileSync = jest.fn();
    fs.mkdirSync = jest.fn();
  });

  afterAll(() => {
    mock.restore();
  })

  it('returns with missing name', async () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureFuncAddPlugin(sls, options);
    await invokeHook(plugin, 'func:add:add');
    expect(sls.cli.log).toBeCalledWith('Need to provide a name of function to add')
  });

  it('returns with pre-existing function', async () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    options['name'] = 'myExistingFunction';
    const plugin = new AzureFuncAddPlugin(sls, options);
    await invokeHook(plugin, 'func:add:add');
    expect(sls.cli.log).toBeCalledWith(`Function myExistingFunction already exists`);
  });

  it('creates function directory and updates serverless.yml', async () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureFuncAddPlugin(sls, options);
    const functionName = 'myFunction';
    options['name'] = functionName;
    await invokeHook(plugin, 'func:add:add');
    expect(fs.mkdirSync).toBeCalledWith(functionName);
    const calls = (fs.writeFileSync as any).mock.calls;
    expect(calls[0][0]).toBe(path.join(functionName, 'index.js'));
    expect(calls[1][0]).toBe(path.join(functionName, 'function.json'));

    const expectedFunctionsYml = MockFactory.createTestFunctionsMetadata();
    expectedFunctionsYml[functionName] = MockFactory.createTestFunctionMetadata(functionName);
    expect(calls[2][0]).toBe('serverless.yml');
    expect(calls[2][1]).toBe(MockFactory.createTestServerlessYml(true, expectedFunctionsYml))
  });
});