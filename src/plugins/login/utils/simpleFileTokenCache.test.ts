import fs from "fs";
import mockFs from "mock-fs";
import { MockFactory } from "../../../test/mockFactory";
import { SimpleFileTokenCache } from "./simpleFileTokenCache";
// import os from "os";

describe("Simple File Token Cache", () => {
  const tokenFilePath = "slsTokenCache.json";

  let fileContent = {
    entries: [],
    subscriptions: []
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
      subscriptions: []
    };

    expect(writeFileSpy).toBeCalledWith(
      tokenFilePath,
      JSON.stringify(expected)
    );
    writeFileSpy.mockRestore();
  });

  it("Create .azure default directory if it doesn't exist", () => {
    mockFs();
    // const makeDirSpy = jest.spyOn(fs, "mkdirSync");
    const mockMkDir = jest.fn(() => {
      console.log("mocking");
    });
    // const mockHomedir = jest.fn(() => {
    //   return ""
    // });
    fs.mkdirSync = mockMkDir;
    // os.homedir = mockHomedir;
    new SimpleFileTokenCache();

    expect(mockMkDir).toBeCalled();
    mockMkDir.mockRestore();
  });

  it("Load file on creation if available", () => {
    fileContent.entries = MockFactory.createTestTokenCacheEntries();

    mockFs({
      "slsTokenCache.json": JSON.stringify(fileContent)
    });

    const readFileSpy = jest.spyOn(fs, "readFileSync");
    const tokenCache = new SimpleFileTokenCache(tokenFilePath);

    expect(readFileSpy).toBeCalled();
    expect(tokenCache.first()).not.toBeNull();
    readFileSpy.mockRestore();
  });

  it("Saves to file after token is added", () => {
    mockFs();

    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    const tokenCache = new SimpleFileTokenCache(tokenFilePath);
    const testEntries = MockFactory.createTestTokenCacheEntries();

    tokenCache.add(testEntries);

    const expected = {
      entries: testEntries,
      subscriptions: []
    };

    expect(tokenCache.isEmpty()).toBe(false);
    expect(writeFileSpy).toBeCalledWith(
      tokenFilePath,
      JSON.stringify(expected)
    );
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
      subscriptions: testSubs
    };

    expect(writeFileSpy).toBeCalledWith(
      tokenFilePath,
      JSON.stringify(expected)
    );
    writeFileSpy.mockRestore();
  });

  it("Doesn't fail adding subs if unable to parse JSON from file", () => {
    mockFs({
      "slsTokenCache.json": JSON.stringify("")
    });

    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    const testFileCache = new SimpleFileTokenCache(tokenFilePath);
    const testSubs = MockFactory.createTestSubscriptions();

    testFileCache.addSubs(testSubs);

    const expected = {
      entries: [],
      subscriptions: testSubs
    };

    expect(writeFileSpy).toBeCalledWith(
      tokenFilePath,
      JSON.stringify(expected)
    );
    writeFileSpy.mockRestore();
  });

  it("Doesn't fail removing entries if unable to parse JSON from file", () => {
    mockFs({
      "slsTokenCache.json": JSON.stringify("")
    });

    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    const testFileCache = new SimpleFileTokenCache(tokenFilePath);
    const testSubs = MockFactory.createTestSubscriptions();
    const testEntries = MockFactory.createTestTokenCacheEntries();

    testFileCache.addSubs(testSubs);
    testFileCache.remove(testEntries);

    const expected = {
      entries: [],
      subscriptions: testSubs
    };

    expect(writeFileSpy).toBeCalledWith(
      tokenFilePath,
      JSON.stringify(expected)
    );
    writeFileSpy.mockRestore();
  });

  it("Doesn't fail find if unable to parse JSON from file", () => {
    mockFs({
      "slsTokenCache.json": JSON.stringify("")
    });

    const testFileCache = new SimpleFileTokenCache(tokenFilePath);
    const testSubs = MockFactory.createTestSubscriptions();

    testFileCache.addSubs(testSubs);
    const cb = jest.fn();
    const result = testFileCache.find({ key: "value" }, cb);

    expect(cb).toBeCalledWith(null, result);
    expect(result).toEqual([]);
  });
});
