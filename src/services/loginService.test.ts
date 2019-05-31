import { AzureLoginService } from "./loginService";

describe('Login Service', () => {
  beforeAll(() => {
    // Because the functions we use for authentication are exported
    // as functions from their respective modules 
    // (open, interactiveLoginWithAuthResponse and 
    // loginWithServicePrincipalSecretWithAuthResponse),
    // it is extremely difficult to mock their functionality.
    // As a workaround, they have been placed in the thinnest possible
    // functions within the Azure Login service, which we will
    // use to make assertions on the functionality of the login service itself
    AzureLoginService.interactiveLogin = jest.fn();
    AzureLoginService.servicePrincipalLogin = jest.fn();
  });

  it('logs in interactively', async () => {
    // Ensure env variables are not set
    delete process.env.azureSubId;
    delete process.env.azureServicePrincipalClientId;
    delete process.env.azureServicePrincipalPassword;
    delete process.env.azureServicePrincipalTenantId;

    await AzureLoginService.login();
    expect(AzureLoginService.interactiveLogin).toBeCalled();
  });

  it('logs in with a service principal', async () => {
    // Set environment variables
    process.env.azureSubId = 'azureSubId';
    process.env.azureServicePrincipalClientId = 'azureServicePrincipalClientId';
    process.env.azureServicePrincipalPassword = 'azureServicePrincipalPassword';
    process.env.azureServicePrincipalTenantId = 'azureServicePrincipalTenantId';

    await AzureLoginService.login();
    expect(AzureLoginService.servicePrincipalLogin).toBeCalledWith(
      'azureServicePrincipalClientId',
      'azureServicePrincipalPassword',
      'azureServicePrincipalTenantId'
    );
  });
});