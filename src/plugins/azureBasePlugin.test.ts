import { AzureBasePlugin } from "./azureBasePlugin";
import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";

class MockPlugin extends AzureBasePlugin {
  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
  }

  public logMessage(message: string) {
    this.log(message);
  }

  public getServerlessOption(key: string, defaultValue?: any) {
    return this.getOption(key, defaultValue);
  }
}

describe("Azure Base Plugin", () => {
  let sls: Serverless;
  let plugin: MockPlugin;

  beforeEach(() => {
    sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    options["key1"] = "val1";
    options["key2"] = "val2";
    plugin = new MockPlugin(sls, options);
  });


  it("logs a message", () => {
    plugin.logMessage("test message");
    expect(sls.cli.log).lastCalledWith("test message");
  });

  it("gets an option", () => {
    expect(plugin.getServerlessOption("key1")).toEqual("val1");
    expect(plugin.getServerlessOption("key2")).toEqual("val2");
    expect(plugin.getServerlessOption("key3")).toBeUndefined();
    expect(plugin.getServerlessOption("key3", "myValue")).toEqual("myValue");
  });
})
