import fs from "fs";
import mockFs from "mock-fs";
import { MockFactory } from "../../test/mockFactory";
import { FuncPluginUtils } from "./funcUtils";

describe("Func Utils", () => {



  beforeAll(() => {
    mockFs({
      "serverless.yml": MockFactory.createTestServerlessYml(true),
      "src/plugins/func/funcHandler.txt": MockFactory.createTestHandler(),
    }, {createCwd: true, createTmp: true})
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockFs.restore();
  });

  
  it("gets functions yml", () => {
    const funcYaml = FuncPluginUtils.getFunctionsYml();
    expect(funcYaml).toEqual(MockFactory.createTestFunctionsMetadata());
  });

  it("updates functions yml", () => {
    const updatedFunctions = MockFactory.createTestFunctionsMetadata(3);
    const originalSls = MockFactory.createTestServerlessYml(false, 2);
    const writeFileSync = jest.spyOn(fs, "writeFileSync");
    FuncPluginUtils.updateFunctionsYml(updatedFunctions, originalSls);
    expect(originalSls.functions).toEqual(updatedFunctions);
  });

  it("adds new function name to function handler", () => {
    const name = "This is my function name"
    expect(FuncPluginUtils.getFunctionHandler(name))
      .toContain(`body: '${name} ' + (req.query.name || req.body.name)`)
  });
});