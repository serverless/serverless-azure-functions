import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import mockFs from "mock-fs";

jest.mock("../../services/functionAppService");
jest.mock("../../services/resourceService");
import { AzureInvoke } from "./azureInvoke";
jest.mock("../../services/invokeService");
import { InvokeService } from "../../services/invokeService";

describe("Azure Invoke Plugin", () => {
  const fileContent =  JSON.stringify({
    name: "Azure-Test",
  });
  afterEach(() => {
    jest.resetAllMocks();
  })

  beforeAll(() => {
    mockFs({
      "testFile.json": fileContent,
    }, { createCwd: true, createTmp: true });
  });
  afterAll(() => {
    mockFs.restore();
  });

  it("Calls invoke hook", async () => {

    const invoke = jest.fn();
    InvokeService.prototype.invoke = invoke;

    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    options["function"] = "testApp";
    options["data"] = "{\"name\": \"AzureTest\"}";
    options["method"] = "GET";

    const plugin = new AzureInvoke(sls, options);
    await invokeHook(plugin, "invoke:invoke");
    expect(invoke).toBeCalledWith(options["function"], options["data"], options["method"]);

  });

  it("Calls the invoke hook with file path", async () => {
    const invoke = jest.fn();
    InvokeService.prototype.invoke = invoke;
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    options["function"] = "testApp";
    options["path"] = "testFile.json";
    options["method"] = "GET";

    const plugin = new AzureInvoke(sls, options);
    await invokeHook(plugin, "invoke:invoke");
    expect(invoke).toBeCalledWith(options["function"], fileContent, options["method"]);
  });

  it("Fails if wrong file name is provided", async () => {
    const invoke = jest.fn();
    InvokeService.prototype.invoke = invoke;
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    options["function"] = "testApp";
    options["path"] = "garbage.json";
    options["method"] = "GET";
    expect(() => new AzureInvoke(sls, options)).toThrow();
  });

  it("The invoke function should not be called when no data is passsed", async () => {
    const invoke = jest.fn();
    InvokeService.prototype.invoke = invoke;
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    options["function"] = "testApp";
    options["data"] = null;
    options["method"] = "GET";
    const plugin = new AzureInvoke(sls, options);
    await invokeHook(plugin, "invoke:invoke"); 
    expect(invoke).not.toBeCalled();
  });
});
