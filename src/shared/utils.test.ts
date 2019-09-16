import path from "path";
import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { FunctionMetadata, Utils } from "./utils";
import { ConfigService } from "../services/configService";

describe("utils", () => {
  let sls: Serverless;

  beforeEach(() => {
    sls = MockFactory.createTestServerless();
    const configService = new ConfigService(sls, {} as any);
    Object.assign(sls.service, configService.getConfig());
  });

  it("resolves handler when handler code is outside function folders", () => {
    const handler = "src/handlers/hello.handler";
    const slsFunctions = sls.service["functions"];
    MockFactory.updateService(sls, {
      ...slsFunctions,
      hello: {
        ...slsFunctions.hello,
        handler
      }
    });
    expect(sls.service["functions"].hello.handler).toEqual(handler);

    const functions = sls.service.getAllFunctions();
    const metadata = Utils.getFunctionMetaData(functions[0], sls);

    const expectedMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: path.normalize("../src/handlers/hello.js"),
      params: expect.anything(),
    };

    expect(metadata).toEqual(expectedMetadata);
  });

  it("resolves handler when code is in function folder", () => {
    const handler = "hello/index.handler";
    const slsFunctions = sls.service["functions"];
    MockFactory.updateService(sls, {
      ...slsFunctions,
      hello: {
        ...slsFunctions.hello,
        handler
      }
    });

    const functions = sls.service.getAllFunctions();
    const metadata = Utils.getFunctionMetaData(functions[0], sls);

    const expectedMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: path.normalize("index.js"),
      params: expect.anything(),
    };

    expect(metadata).toEqual(expectedMetadata);
  });

  it("resolves handler when code is at the project root", () => {
    const handler = "hello.handler";
    const slsFunctions = sls.service["functions"];
    MockFactory.updateService(sls, {
      ...slsFunctions,
      hello: {
        ...slsFunctions.hello,
        handler
      }
    });

    const functions = sls.service.getAllFunctions();
    const metadata = Utils.getFunctionMetaData(functions[0], sls);

    const expectedMetadata: FunctionMetadata = {
      entryPoint: "handler",
      handlerPath: path.normalize("../hello.js"),
      params: expect.anything(),
    };

    expect(metadata).toEqual(expectedMetadata);
  });

  it("should create string from substrings", () => {
    expect(
      Utils.appendSubstrings(
        2,
        "abcde",
        "fghij",
        "klmno",
        "pqrst",
        "uvwxyz",
        "ab",
      )
    ).toEqual("abfgklpquvab");
  });

  it("should get a timestamp from a name", () => {
    expect(Utils.getTimestampFromName("myDeployment-t12345")).toEqual("12345");
    expect(Utils.getTimestampFromName("myDeployment-t678987645")).toEqual("678987645");
    expect(Utils.getTimestampFromName("-t12345")).toEqual("12345");

    expect(Utils.getTimestampFromName("myDeployment-t")).toEqual(null);
    expect(Utils.getTimestampFromName("")).toEqual(null);
  });

  it("should get incoming binding", () => {
    expect(Utils.getIncomingBindingConfig(MockFactory.createTestAzureFunctionConfig())).toEqual(
      {
        http: true,
        "x-azure-settings": MockFactory.createTestHttpBinding("in"),
      }
    );
  });

  it("should get outgoing binding", () => {
    expect(Utils.getOutgoingBinding(MockFactory.createTestAzureFunctionConfig())).toEqual(
      {
        http: true,
        "x-azure-settings": MockFactory.createTestHttpBinding("out"),
      }
    );
  });

  describe("runWithRetry", () => {
    it("returns values after 1st run", async () => {
      const expected = "success";
      let lastRetry = 0;

      const result = await Utils.runWithRetry((retry) => {
        lastRetry = retry;
        return Promise.resolve(expected);
      });

      expect(lastRetry).toEqual(1);
      expect(result).toEqual(expected);
    });

    it("returns values after successfully retry (reject promise)", async () => {
      const expected = "success";
      let lastRetry = 0;

      const result = await Utils.runWithRetry((retry) => {
        lastRetry = retry;
        if (retry === 1) {
          return Promise.reject("rejected");
        }

        return Promise.resolve(expected);
      });

      expect(lastRetry).toEqual(2);
      expect(result).toEqual(expected);
    });

    it("returns values after successfully retry (throw error)", async () => {
      const expected = "success";
      let lastRetry = 0;

      const result = await Utils.runWithRetry((retry) => {
        lastRetry = retry;
        if (retry === 1) {
          throw new Error("Ooops!")
        }

        return Promise.resolve(expected);
      });

      expect(lastRetry).toEqual(2);
      expect(result).toEqual(expected);
    });
    it("throws error after reties", async () => {
      const maxRetries = 5;
      let lastRetry = 0;

      const test = async () => {
        await Utils.runWithRetry((retry) => {
          lastRetry = retry;
          return Promise.reject("rejected");
        }, maxRetries, 100);
      };

      await expect(test()).rejects.toEqual("rejected");
      expect(lastRetry).toEqual(maxRetries);
    });
  });

  describe("wait", () => {
    const setTimeoutMock = jest.fn((resolve) => resolve());

    beforeEach(() => {
      global.setTimeout = setTimeoutMock;
    });

    it("waits 1000 by default", async () => {
      await Utils.wait();

      expect(setTimeoutMock).toBeCalledWith(expect.any(Function), 1000);
    });

    it("waits specified time", async () => {
      await Utils.wait(2000);

      expect(setTimeoutMock).toBeCalledWith(expect.any(Function), 2000);
    });
  });
});
