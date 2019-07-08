import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import mockFs from "mock-fs";
import { AzureInvoke } from "./azureInvoke";
jest.mock("../../services/functionAppService");
jest.mock("../../services/resourceService");
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

  it("calls invoke hook", async () => {
    const expectedResult = { data: "test" };
    const invoke = jest.fn(() => expectedResult);
    InvokeService.prototype.invoke = invoke as any;

    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    options["function"] = "testApp";
    options["data"] = "{\"name\": \"AzureTest\"}";
    options["method"] = "GET";

    const plugin = new AzureInvoke(sls, options);
    await invokeHook(plugin, "invoke:invoke");
    expect(invoke).toBeCalledWith(options["method"], options["function"], options["data"]);
    expect(sls.cli.log).toBeCalledWith(JSON.stringify(expectedResult.data));
  });

  it("calls the invoke hook with file path", async () => {
    const expectedResult = { data: "test" };
    const invoke = jest.fn(() => expectedResult);
    InvokeService.prototype.invoke = invoke as any;
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    options["function"] = "testApp";
    options["path"] = "testFile.json";
    options["method"] = "GET";
    const plugin = new AzureInvoke(sls, options);
    await invokeHook(plugin, "invoke:invoke");
    expect(invoke).toBeCalledWith(options["method"], options["function"], fileContent);
    expect(sls.cli.log).toBeCalledWith(JSON.stringify(expectedResult.data));
  
  });

  it("calls the invoke hook with file path", async () => {
    const invoke = jest.fn();
    InvokeService.prototype.invoke = invoke;
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    options["function"] = "testApp";
    options["path"] = "notExist.json";
    options["method"] = "GET";
    expect(() => new AzureInvoke(sls, options)).toThrow();
  });
  
  it("Function invoked with no data", async () => {
    const expectedResult = { data: "test" };
    const invoke = jest.fn(() => expectedResult);
    InvokeService.prototype.invoke = invoke as any;
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    options["function"] = "testApp";
    options["method"] = "GET";
    const plugin = new AzureInvoke(sls, options);
    await invokeHook(plugin, "invoke:invoke"); 
    expect(invoke).toBeCalledWith(options["method"], options["function"], undefined);
    expect(sls.cli.log).toBeCalledWith(JSON.stringify(expectedResult.data));
  });

  it("The invoke function fails when no function name is passed", async () => {
    const invoke = jest.fn();
    InvokeService.prototype.invoke = invoke;
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    options["function"] = null;
    options["data"] = "{\"name\": \"AzureTest\"}";
    options["method"] = "GET";
    const plugin = new AzureInvoke(sls, options);
    await invokeHook(plugin, "invoke:invoke"); 
    expect(invoke).not.toBeCalled();
  });
});
