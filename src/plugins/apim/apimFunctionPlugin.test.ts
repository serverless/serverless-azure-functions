import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureApimFunctionPlugin } from './apimFunctionPlugin';

jest.mock('../../services/apimService');
import { ApimService } from '../../services/apimService';

describe('APIM Function Plugin', () => {
  it('calls deploy function', async () => {
    const deployFunction = jest.fn();

    ApimService.prototype.deployFunction = deployFunction;

    const sls = MockFactory.createTestServerless();
    sls.service.provider['apim'] = 'apim config'
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureApimFunctionPlugin(sls, options);

    await invokeHook(plugin, 'after:deploy:function:deploy');

    expect(sls.cli.log).toBeCalledWith('Starting APIM function deployment')
    expect(deployFunction).toBeCalled();
    expect(sls.cli.log).lastCalledWith('Finished APIM function deployment')
  });
});