import * as fs from "fs";
import path from "path";
import os from "os";

const CONFIG_DIRECTORY = path.join(os.homedir(), ".azure");
const SLS_TOKEN_FILE = path.join(CONFIG_DIRECTORY, "slsTokenCache.json");

export class SimpleFileTokenCache {
  private tokens: any[] = [];
  private subscriptions: any[] = [];
  public constructor() {
    console.log("new Simple file toke cache");
    this.load();
  }

  public isSecureCache() {
    throw "isSecureCache not implemented";
  }

  public add(entries: any, cb: any) {
    console.log("adding")
    this.tokens.push(...entries);
    this.save();
    cb();
  }

  public addSubs(entries: any) {
    console.log("adding")
    this.subscriptions.push(...entries);
    this.save();
  }

  public remove(entries: any, cb: any) {
    console.log("remove")
    this.tokens = this.tokens.filter(e => {
      return !Object.keys(entries[0]).every(key => e[key] === entries[0][key]);
    });
    this.save();
    cb();
  }

  public clear(cb: any) {
    console.log("clear");
    this.tokens = [];
    this.subscriptions = [];
    this.save();
    cb();
  }

  public find(query, cb) {
    console.log("find")
    let result = this.tokens.filter(e => {
      return Object.keys(query).every(key => e[key] === query[key]);
    });
    cb(null, result);
    return result;
  }

  public empty() {
    console.log("empty")
    // this.deleteOld();
    return this.tokens.length === 0;
  }

  public first() {
    return this.tokens[0];
  }

  public listSubscriptions() {
    return this.subscriptions;
  }
  
  private load() {
    try {
      let savedCache = JSON.parse(fs.readFileSync(SLS_TOKEN_FILE).toString());
      this.tokens = savedCache.tokens;
      this.tokens.map(t => t.expiresOn = new Date(t.expiresOn))
      this.subscriptions = savedCache.subscriptions;
    } catch (e) {}
  }

  public save() {
    console.log("save")
    fs.writeFileSync(SLS_TOKEN_FILE, JSON.stringify({tokens: this.tokens, subscriptions: this.subscriptions}));
  }

  private deleteOld() {
    this.tokens = this.tokens.filter(
      t => t.expiresOn > Date.now() - 5 * 60 * 1000
    );
  }
}
