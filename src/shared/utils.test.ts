import path from "path";
import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { FunctionMetadata, Utils } from "./utils";

describe("utils", () => {
  let sls: Serverless;

  beforeEach(() => {
    const slsConfig = {
      service: "my test service",
      provider: "azure",
      functions: MockFactory.createTestSlsFunctionConfig(),
    };

    sls = MockFactory.createTestServerless();
    Object.assign(sls.service, slsConfig);
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
