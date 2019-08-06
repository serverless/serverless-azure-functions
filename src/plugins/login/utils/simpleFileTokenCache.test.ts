import fs from "fs";
import mockFs from "mock-fs";
import path from "path";
import os from "os";
import { MockFactory } from "../../../test/mockFactory";
import { SimpleFileTokenCache } from "./simpleFileTokenCache";

describe("Simple File Token Cache", () => {
  const CONFIG_DIRECTORY = path.join(os.homedir(), ".azure");
  const SLS_TOKEN_FILE = path.join(CONFIG_DIRECTORY, "slsTokenCache.json");
  const fileContent = JSON.stringify({
    _entries: [],
    subscriptions: [],
  });
  
  beforeAll(() => {
    const fakeFs = {};
    fakeFs[SLS_TOKEN_FILE] = fileContent;
    mockFs(fakeFs, { createCwd: true, createTmp: true });
    // mockFs({});
  });

  afterEach(() => {
    jest.resetAllMocks();
    mockFs.restore();
  });

  it("Tries to load file on creation", () => {
    const readFileSpy = jest.spyOn(fs, "readFileSync");
    const calls = readFileSpy.mock.calls;
    const testFileCache = new SimpleFileTokenCache();

    expect(calls).toHaveLength(1);
    expect([calls[0][0], calls[0][1]]).toEqual([SLS_TOKEN_FILE, {_entries: testEntries, subscriptions: []}]);
  })

  it("Saves to file after token is added", () => {
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    const calls = writeFileSpy.mock.calls;
    const testFileCache = new SimpleFileTokenCache();
    const testEntries = MockFactory.createTestTokenCacheEntries();


    testFileCache.add(testEntries);

    expect(writeFileSpy).toBeCalledTimes(1);
    // expect(calls).toHaveLength(1);
    // expect([calls[0][0], calls[0][1]]).toEqual([SLS_TOKEN_FILE, {_entries: testEntries, subscriptions: []}]);
  })
});