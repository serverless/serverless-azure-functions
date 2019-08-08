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

  public add(entries: any[], callback?: (err?: Error, result?: boolean) => void) {
    this.entries.push(...entries);
    this.save();
    if (callback) {
      callback();
    }
  }

  public remove(entries: any[], callback?: (err?: Error, result?: null) => void) {
    this.entries = this.entries.filter(e => {
      return !Object.keys(entries[0]).every(key => e[key] === entries[0][key]);
    });
    this.save();
    if (callback) {
      callback();
    }
  }

  public find(query: any, callback: (err?: Error, result?: any[]) => void) {
    let result = this.entries.filter(e => {
      return Object.keys(query).every(key => e[key] === query[key]);
    });
    callback(null, result);
    return result;
  }

  //-------- File toke cache specific methods

  public addSubs(subscriptions: any) {
    this.subscriptions.push(...subscriptions);
    this.subscriptions = this.subscriptions.reduce((accumulator , current) => {
      const x = accumulator .find(item => item.id === current.id);
      if (!x) {
        return accumulator .concat([current]);
      } else {
        return accumulator ;
      }
    }, []);
    this.save();
  }


  public clear(callback: any) {
    this.entries = [];
    this.subscriptions = [];
    this.save();
    callback();
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
