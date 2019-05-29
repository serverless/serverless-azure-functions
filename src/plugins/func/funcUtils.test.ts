import fs from "fs";
import mock from "mock-fs";
import { MockFactory } from "../../test/mockFactory";
import { FuncPluginUtils } from "./funcUtils";

describe("Func Utils", () => {

  beforeAll(() => {
    mock({
      "serverless.yml": MockFactory.createTestServerlessYml(true)
    }, {createCwd: true, createTmp: true})
    fs.writeFileSync = jest.fn();
  });

  afterAll(() => {
    mock.restore();
  })

  
  it("gets functions yml", () => {
    const funcYaml = FuncPluginUtils.getFunctionsYml();
    const expected = {
      "functions": MockFactory.createTestFunctionsMetadata()
    }
    expect(funcYaml).toEqual(expected);
  });

  it("updates functions yml", () => {
    FuncPluginUtils.updateFunctionsYml(
      MockFactory.createTestFunctionsMetadata(3, true),
      MockFactory.createTestServerlessYml(true, 2) as string);
    const call = (fs.writeFileSync as any).mock.calls[0]
    expect(call[0]).toBe("serverless.yml");
    expect(call[1]).toBe(MockFactory.createTestServerlessYml(
      true, 
      MockFactory.createTestFunctionsMetadata(3)
    ));
  });

  it("adds new function name to function handler", () => {
    const name = "This is my function name"
    expect(FuncPluginUtils.getFunctionHandler(name))
      .toContain(`body: "${name} " + (req.query.name || req.body.name)`)
  });
});