import fs from "fs";
import mock from "mock-fs";
import { MockFactory } from "../../test/mockFactory";
import { FuncPluginUtils } from "./funcUtils";

describe("Func Utils", () => {

  const writeFileSync = jest.spyOn(fs, "writeFileSync");

  beforeAll(() => {
    mock({
      "serverless.yml": MockFactory.createTestServerlessYml(true)
    }, {createCwd: true, createTmp: true})
  });

  afterAll(() => {
    mock.restore();
  })

  
  it("gets functions yml", () => {
    const funcYaml = FuncPluginUtils.getFunctionsYml();
    expect(funcYaml).toEqual(MockFactory.createTestFunctionsMetadata());
  });

  it("updates functions yml", () => {
    const updatedFunctions = MockFactory.createTestFunctionsMetadata(3);
    const originalSls = MockFactory.createTestServerlessYml(false, 2);
    
    FuncPluginUtils.updateFunctionsYml(updatedFunctions, originalSls);
    const call = writeFileSync.mock.calls[0]
    expect(call[0]).toBe("serverless.yml");
    const expected = MockFactory.createTestServerlessYml(
      true, 
      MockFactory.createTestFunctionsMetadata(3)
    );
    expect(call[1]).toBe(expected);
  });

  it("adds new function name to function handler", () => {
    const name = "This is my function name"
    expect(FuncPluginUtils.getFunctionHandler(name))
      .toContain(`body: "${name} " + (req.query.name || req.body.name)`)
  });
});