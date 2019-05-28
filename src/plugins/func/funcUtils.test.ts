import { MockFactory } from '../../test/mockFactory';
import { originalSlsYml, additionalFunctionSlsYml, additionalFunctionYml } from '../../test/sampleData';
import { FuncPluginUtils } from './funcUtils';
import fs from 'fs';
import mock from 'mock-fs'

describe('Func Utils', () => {

  beforeAll(() => {
    mock({
      'serverless.yml': originalSlsYml
    }, {createCwd: true, createTmp: true})
    fs.writeFileSync = jest.fn();
  });

  afterAll(() => {
    mock.restore();
  })

  
  it('gets functions yml', () => {
    const sls = FuncPluginUtils.getServerlessYml();
    expect(FuncPluginUtils.getFunctionsYml(originalSlsYml)).toEqual(
      MockFactory.createTestFunctionsMetadata());
  });

  it('updates functions yml', () => {
    FuncPluginUtils.updateFunctionsYml(additionalFunctionYml, originalSlsYml);
    expect(fs.writeFileSync).toBeCalledWith('serverless.yml', additionalFunctionSlsYml);
  });
});