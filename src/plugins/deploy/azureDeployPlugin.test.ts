import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureDeployPlugin } from "./azureDeployPlugin";

jest.mock("../../services/resourceService");
jest.mock("../../services/functionAppService");
import { FunctionAppService } from "../../services/functionAppService";
import { ResourceService } from "../../services/resourceService";

describe('Deploy plugin', () => {
  
  it('calls deploy hook', async () => {
    const deployResourceGroup = jest.fn();
    const functionAppStub = "Function App Stub";
    const deploy = jest.fn(() => Promise.resolve(functionAppStub));
    const uploadFunctions = jest.fn();

    ResourceService.prototype.deployResourceGroup = deployResourceGroup
    FunctionAppService.prototype.deploy = deploy
    FunctionAppService.prototype.uploadFunctions = uploadFunctions

    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    const plugin = new AzureDeployPlugin(sls, options);
    
    await invokeHook(plugin, 'deploy:deploy');
    
    expect(deployResourceGroup).toBeCalled();
    expect(deploy).toBeCalled();
    expect(uploadFunctions).toBeCalledWith(functionAppStub);
  });
});