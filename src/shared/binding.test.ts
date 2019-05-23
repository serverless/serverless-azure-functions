import { MockFactory } from '../test/mockFactory';
import { getBindingsMetaData, createEventsBindings } from './bindings'

describe('Bindings', () => {
  it('should get bindings metadata from serverless', () => {
    const sls = MockFactory.createTestServerless();
    expect(sls).not.toBeNull();
    const bindingsMetadata = getBindingsMetaData(sls);
    expect(sls.cli.log).toBeCalledWith('Parsing Azure Functions Bindings.json...');
  });
});