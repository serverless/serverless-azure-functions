import { MockFactory } from "../../test/mockFactory";
import { invokeHook } from "../../test/utils";
jest.mock("../../services/functionAppService");

jest.mock("../../services/resourceService");
import { ResourceService } from "../../services/resourceService";
import { Site } from "@azure/arm-appservice/esm/models";
import { AzureInvoke } from "./azureInvoke";
jest.mock("../../services/invokeService");
import { InvokeService } from "../../services/invokeService";

describe("Azure Invoke Plugin", () => {
    it("calls invoke hook", async () => {

      const invoke = jest.fn();
      const functionAppStub: Site = MockFactory.createTestSite();
      const azureinvoke = jest.fn(() => Promise.resolve(functionAppStub));

      InvokeService.prototype.invoke = invoke;

      const sls = MockFactory.createTestServerless();
      const options = MockFactory.createTestServerlessOptions();
      const plugin = new AzureInvoke(sls, options);
      //Not sure
      await invokeHook(plugin, "invoke:invoke");
      expect(invoke).toBeCalled();
      });
    });