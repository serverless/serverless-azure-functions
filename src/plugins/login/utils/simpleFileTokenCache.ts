import fs from "fs";
import path from "path";
import os from "os";
import * as adal from "adal-node";

const CONFIG_DIRECTORY = path.join(os.homedir(), ".azure");
const DEFAULT_SLS_TOKEN_FILE = path.join(CONFIG_DIRECTORY, "slsTokenCache.json");

export class SimpleFileTokenCache implements adal.TokenCache {
  private entries: any[] = [];
  private subscriptions: any[] = [];

  public constructor(private tokenPath: string = DEFAULT_SLS_TOKEN_FILE) {
    this.load();
  }

  public add(entries: any, cb?: any) {
    this.entries.push(...entries);
    this.save();
    if (cb) {
      cb();
    }
  }

  public remove(entries: any, cb?: any) {
    this.entries = this.entries.filter(e => {
      return !Object.keys(entries[0]).every(key => e[key] === entries[0][key]);
    });
    this.save();
    if (cb) {
      cb();
    }
  }

  public find(query: any, cb?: any) {
    let result = this.entries.filter(e => {
      return Object.keys(query).every(key => e[key] === query[key]);
    });
    cb(null, result);
    return result;
  }

  //-------- File toke cache specific methods

  public addSubs(entries: any) {
    this.subscriptions.push(...entries);
    this.subscriptions = this.subscriptions.reduce((acc, current) => {
      const x = acc.find(item => item.id === current.id);
      if (!x) {
        return acc.concat([current]);
      } else {
        return acc;
      }
    }, []);
    this.save();
  }


  public clear(cb: any) {
    this.entries = [];
    this.subscriptions = [];
    this.save();
    cb();
  }

  public isEmpty() {
    return this.entries.length === 0;
  }

  public first() {
    return this.entries[0];
  }

  public listSubscriptions() {
    return this.subscriptions;
  }

  private load() {
    if (fs.existsSync(this.tokenPath)) {
      let savedCache = JSON.parse(fs.readFileSync(this.tokenPath).toString());
      this.entries = savedCache.entries;
      this.entries.map(t => t.expiresOn = new Date(t.expiresOn))
      this.subscriptions = savedCache.subscriptions;
    } else {
      this.save();
    }
  }

  public save() {
    fs.writeFileSync(this.tokenPath, JSON.stringify({ entries: this.entries, subscriptions: this.subscriptions }));
  }
}
