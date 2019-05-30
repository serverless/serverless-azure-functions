import { MockFactory } from "../../test/mockFactory";
import { FuncPluginUtils } from "./funcUtils";

describe("Func Utils", () => {
  
  it("gets functions yml", () => {
    const sls = MockFactory.createTestServerless();
    const funcYaml = FuncPluginUtils.getFunctionsYml(sls);
    expect(funcYaml).toEqual(MockFactory.createTestFunctionsMetadata());
  });

  it("updates functions yml", () => {
    const updatedFunctions = MockFactory.createTestFunctionsMetadata(3);
    const originalSls = MockFactory.createTestServerlessYml(false, 2);
    const sls = MockFactory.createTestServerless();
    FuncPluginUtils.updateFunctionsYml(sls, updatedFunctions, originalSls);
    const calls = (sls.utils.writeFileSync as any).mock.calls[0]
    expect(calls[0]).toBe("serverless.yml");
    const expected = MockFactory.createTestServerlessYml(
      true, 
      MockFactory.createTestFunctionsMetadata(3)
    );
    expect(calls[1]).toBe(expected);
  });

  it("adds new function name to function handler", () => {
    const name = "This is my function name"
    const handler = FuncPluginUtils.getFunctionHandler(name);
    expect(handler)
      .toContain(`body: "${name} " + (req.query.name || req.body.name)`);    
  });
});