import fs from "fs";
import mockFs from "mock-fs";
import path from "path";
import os from "os";
import { MockFactory } from "../../../test/mockFactory";
import { SimpleFileTokenCache } from "./simpleFileTokenCache";

describe("Simple File Token Cache", () => {
  let fileContent = {
    _entries: [],
    subscriptions: [],
  };
  
  beforeEach(() => {
    fileContent = {
      _entries: [],
      subscriptions: [],
    };
  });
  
  beforeAll(() => {
    // const fakeFs = {};
    // fakeFs[SLS_TOKEN_FILE] = fileContent;
    // mockFs(fakeFs, { createCwd: true, createTmp: true });
    // mockFs({});
  });

  afterEach(() => {
    mockFs.restore();
    jest.resetAllMocks();
  });

  it("Creates a load file on creation if none", () => {
    mockFs({});
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    // const calls = readFileSpy.mock.calls;
    const testFileCache = new SimpleFileTokenCache("./slsTokenCache.json");

    expect(writeFileSpy).toBeCalledTimes(1);
    // expect(calls).toHaveLength(1);
    // expect([calls[0][0], calls[0][1]]).toEqual([SLS_TOKEN_FILE, {_entries: testEntries, subscriptions: []}]);
  });

  it("Load file on creation if available", () => {
    const fakeFs = {};
    fileContent._entries = MockFactory.createTestTokenCacheEntries();
    fakeFs["./slsTokenCache.json"] = fileContent;
    mockFs(fakeFs, { createCwd: true, createTmp: true });
    const readFileSpy = jest.spyOn(fs, "readFileSync");
    const calls = readFileSpy.mock.calls;
    const testFileCache = new SimpleFileTokenCache("./slsTokenCache.json");

    expect(readFileSpy).toBeCalledTimes(1);
    // expect(calls).toHaveLength(1);
    // expect([calls[0][0], calls[0][1]]).toEqual([SLS_TOKEN_FILE, {_entries: testEntries, subscriptions: []}]);
  })

  it("Saves to file after token is added", () => {
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    const calls = writeFileSpy.mock.calls;
    const testFileCache = new SimpleFileTokenCache("./");
    const testEntries = MockFactory.createTestTokenCacheEntries();

    testFileCache.add(testEntries);

    expect(testFileCache.isEmpty()).toBe(false);
    expect(writeFileSpy).toBeCalledTimes(1);
    // expect(calls).toHaveLength(1);
    // expect([calls[0][0], calls[0][1]]).toEqual([SLS_TOKEN_FILE, {_entries: testEntries, subscriptions: []}]);
  });

  it("Saves to file after subscription is added", () => {
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    const calls = writeFileSpy.mock.calls;
    const testFileCache = new SimpleFileTokenCache("./");
    const testSubs = MockFactory.createTestSubscriptions();


    testFileCache.addSubs(testSubs);

    expect(writeFileSpy).toBeCalledTimes(1);
    // expect(calls).toHaveLength(1);
    // expect([calls[0][0], calls[0][1]]).toEqual([SLS_TOKEN_FILE, {_entries: testEntries, subscriptions: []}]);
  });
});