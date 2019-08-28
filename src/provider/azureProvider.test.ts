import { MockFactory } from "../test/mockFactory";
import AzureProvider from "./azureProvider"

describe("Azure Provider", () => {

  it("sets the provider name in initialization", () => {
    const sls = MockFactory.createTestServerless();
    new AzureProvider(sls);
    expect(sls.setProvider).toBeCalledWith("azure", expect.anything());
    expect(AzureProvider.getProviderName()).toEqual("azure");
  });
});
