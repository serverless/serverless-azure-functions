import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
import { AzureRollbackPlugin } from "./azureRollbackPlugin";

jest.mock("../../services/rollbackService");
import { RollbackService } from "../../services/rollbackService";

describe("Rollback Plugin", () => {
  it("should call rollback service", async () => {
    const plugin = new AzureRollbackPlugin(
      MockFactory.createTestServerless(),
      MockFactory.createTestServerlessOptions(),
    );
    await invokeHook(plugin, "rollback:rollback");
    expect(RollbackService.prototype.rollback).toBeCalled();
  })
});
