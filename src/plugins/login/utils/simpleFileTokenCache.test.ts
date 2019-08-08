import fs from "fs";
import mockFs from "mock-fs";
import { MockFactory } from "../../../test/mockFactory";
import { SimpleFileTokenCache } from "./simpleFileTokenCache";

describe("Simple File Token Cache", () => {
  const tokenFilePath = "slsTokenCache.json";

  let fileContent = {
    entries: [],
    subscriptions: [],
  };

  afterEach(() => {
    mockFs.restore();
  });

  it("Creates a load file on creation if none", () => {
    mockFs();

    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    new SimpleFileTokenCache(tokenFilePath);

    const expected = {
      entries: [],
      subscriptions: [],
    };

    expect(writeFileSpy).toBeCalledWith(tokenFilePath, JSON.stringify(expected));
    writeFileSpy.mockRestore();
  });

  it("Load file on creation if available", () => {
    fileContent.entries = MockFactory.createTestTokenCacheEntries();

    mockFs({
      "slsTokenCache.json": JSON.stringify(fileContent),
    });

    const readFileSpy = jest.spyOn(fs, "readFileSync");
    const tokenCache = new SimpleFileTokenCache(tokenFilePath);

    expect(readFileSpy).toBeCalled();
    expect(tokenCache.first()).not.toBeNull();
    readFileSpy.mockRestore();
  })

  it("Saves to file after token is added", () => {
    mockFs();

    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    const tokenCache = new SimpleFileTokenCache(tokenFilePath);
    const testEntries = MockFactory.createTestTokenCacheEntries();

    tokenCache.add(testEntries);

    const expected = {
      entries: testEntries,
      subscriptions: [],
    };

    expect(tokenCache.isEmpty()).toBe(false);
    expect(writeFileSpy).toBeCalledWith(tokenFilePath, JSON.stringify(expected));
    writeFileSpy.mockRestore();
  });

  it("Saves to file after subscription is added", () => {
    mockFs();

    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    const testFileCache = new SimpleFileTokenCache(tokenFilePath);
    const testSubs = MockFactory.createTestSubscriptions();

    testFileCache.addSubs(testSubs);

    const expected = {
      entries: [],
      subscriptions: testSubs,
    };

    expect(writeFileSpy).toBeCalledWith(tokenFilePath, JSON.stringify(expected));
    writeFileSpy.mockRestore();
  });
});
