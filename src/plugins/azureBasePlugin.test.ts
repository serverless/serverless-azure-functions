import { AzureBasePlugin } from "./azureBasePlugin";
import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";

class MockPlugin extends AzureBasePlugin {
  public constructor(serverless: Serverless) {
    super(serverless);
  }

  public logMessage(message: string) {
    this.log(message);
  }
}

describe("Azure Base Plugin", () => {
  let sls: Serverless;
  let plugin: MockPlugin;

  beforeEach(() => {
    sls = MockFactory.createTestServerless();
    plugin = new MockPlugin(sls);
  });


  it("logs a message", () => {
    plugin.logMessage("test message");
    expect(sls.cli.log).lastCalledWith("test message");
  })
})
