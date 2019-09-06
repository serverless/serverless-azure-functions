import { AzureLoginService } from "./loginService";
jest.mock("open");
import open from "open";

jest.mock("@azure/ms-rest-nodeauth");
import * as nodeauth from "@azure/ms-rest-nodeauth";

jest.mock("../plugins/login/utils/simpleFileTokenCache");
import { SimpleFileTokenCache } from "../plugins/login/utils/simpleFileTokenCache";
import { MockFactory } from "../test/mockFactory";

describe("Login Service", () => {

  let loginService: AzureLoginService;

  beforeEach(() => {
    loginService = new AzureLoginService(
      MockFactory.createTestServerless(),
      MockFactory.createTestServerlessOptions()
    )
  })

  it("logs in interactively with no cached login", async () => {
    // Ensure env variables are not set
    delete process.env.AZURE_SUBSCRIPTION_ID;
    delete process.env.AZURE_CLIENT_ID;
    delete process.env.AZURE_CLIENT_SECRET;
    delete process.env.AZURE_TENANT_ID;

    SimpleFileTokenCache.prototype.isEmpty = jest.fn(() => true);

    const emptyObj = { subscriptions: [] };
    Object.defineProperty(nodeauth,
      "interactiveLoginWithAuthResponse",
      { value: jest.fn(() => emptyObj) }
    );

    await loginService.login();
    expect(SimpleFileTokenCache).toBeCalled();
    expect(open).toBeCalledWith("https://microsoft.com/devicelogin");
    expect(nodeauth.interactiveLoginWithAuthResponse).toBeCalled();
    expect(SimpleFileTokenCache.prototype.addSubs).toBeCalledWith(emptyObj.subscriptions);
  });

  it("logs in with a cached login", async () => {
    // Ensure env variables are not set
    delete process.env.AZURE_SUBSCRIPTION_ID;
    delete process.env.AZURE_CLIENT_ID;
    delete process.env.AZURE_CLIENT_SECRET;
    delete process.env.AZURE_TENANT_ID;

    SimpleFileTokenCache.prototype.isEmpty = jest.fn(() => false);
    SimpleFileTokenCache.prototype.first = jest.fn(() => ({ userId: "" }));

    await loginService.login();
    expect(SimpleFileTokenCache).toBeCalled();
    expect(nodeauth.DeviceTokenCredentials).toBeCalled();
    expect(SimpleFileTokenCache.prototype.listSubscriptions).toBeCalled();
  });

  it("logs in with a service principal", async () => {
    // Set environment variables
    process.env.AZURE_SUBSCRIPTION_ID = "AZURE_SUBSCRIPTION_ID";
    process.env.AZURE_CLIENT_ID = "AZURE_CLIENT_ID";
    process.env.AZURE_CLIENT_SECRET = "AZURE_CLIENT_SECRET";
    process.env.AZURE_TENANT_ID = "AZURE_TENANT_ID";

    await loginService.login();
    expect(nodeauth.loginWithServicePrincipalSecretWithAuthResponse).toBeCalledWith(
      "AZURE_CLIENT_ID",
      "AZURE_CLIENT_SECRET",
      "AZURE_TENANT_ID",
      undefined // would be options
    );
  });
});
