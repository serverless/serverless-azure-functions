import { AzureBasePlugin } from "./azureBasePlugin";
import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";

jest.mock("../services/loggingService");
import { LoggingService } from "../services/loggingService";

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

  public err(message: string) {
    this.error(message);
  }

  public war(message: string) {
    this.warn(message);
  }

  public inf(message: string) {
    this.info(message);
  }

  public deb(message: string) {
    this.debug(message);
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
    expect(LoggingService.prototype.log).lastCalledWith("test message", undefined);
  });

  it("gets an option", () => {
    expect(plugin.getServerlessOption("key1")).toEqual("val1");
    expect(plugin.getServerlessOption("key2")).toEqual("val2");
    expect(plugin.getServerlessOption("key3")).toBeUndefined();
    expect(plugin.getServerlessOption("key3", "myValue")).toEqual("myValue");
  });

  it("calls LoggingService", () => {
    const mockPlugin = new MockPlugin(sls, {} as any);
    
    mockPlugin.err("error");
    expect(LoggingService.prototype.error).toBeCalledWith("error");

    mockPlugin.war("warn");
    expect(LoggingService.prototype.warn).toBeCalledWith("warn");

    mockPlugin.inf("info");
    expect(LoggingService.prototype.info).toBeCalledWith("info");

    mockPlugin.deb("debug");
    expect(LoggingService.prototype.debug).toBeCalledWith("debug");
  });
})
