import path from "path";
import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { OfflineService } from "./offlineService";

describe("Offline Service", () => {

  function createService(sls?: Serverless) {
    return new OfflineService(
      sls || MockFactory.createTestServerless(),
      MockFactory.createTestServerlessOptions(),
    )
  }

  it("builds required files for offline execution", async () => {
    const sls = MockFactory.createTestServerless();
    const service = createService(sls);
    await service.build();
    const calls = (sls.utils.writeFileSync as any).mock.calls;
    const functionNames = sls.service.getAllFunctions();
    const expectedFunctionJson = MockFactory.createTestBindingsObject();
    for (let i = 0; i < calls.length; i++) {
      const name = functionNames[i];
      expect(calls[i][0]).toEqual(`${name}${path.sep}function.json`)
      expect(JSON.parse(calls[i][1])).toEqual(expectedFunctionJson);
    }
  });
});