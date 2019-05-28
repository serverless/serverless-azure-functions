import { MockFactory } from '../../test/mockFactory';
import { serverlessYmlString } from '../../test/sampleData';
import { FuncPluginUtils } from './funcUtils';
import fs from 'fs';
import mock from 'mock-fs'

describe('Func Utils', () => {

  beforeAll(() => {
    mock({
      'serverless.yml': serverlessYmlString
    }, {createCwd: true, createTmp: true})
  });

  afterAll(() => {
    mock.restore();
  })

  
  it('gets functions yml', () => {
    const sls = FuncPluginUtils.getServerlessYml();
    expect(FuncPluginUtils.getFunctionsYml(serverlessYmlString)).toEqual(MockFactory.createTestFunctionsMetadata());
  });
});