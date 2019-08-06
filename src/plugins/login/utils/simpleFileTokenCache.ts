import * as fs from "fs";
import path from "path";
import os from "os";
import * as adal from "adal-node";

const CONFIG_DIRECTORY = path.join(os.homedir(), ".azure");
const SLS_TOKEN_FILE = path.join(CONFIG_DIRECTORY, "slsTokenCache.json");

export class SimpleFileTokenCache implements adal.TokenCache{
  private _entries: any[] = [];
  private subscriptions: any[] = [];
  public constructor() {
    this.load();
  }

  public add(entries: any, cb?: any) {
    this._entries.push(...entries);
    this.save();
    if(cb) {
      cb();
    }
  }

  public remove(entries: any, cb?: any) {
    this._entries = this._entries.filter(e => {
      return !Object.keys(entries[0]).every(key => e[key] === entries[0][key]);
    });
    this.save();
    if(cb) {
      cb();
    }
  }

  public find(query: any, cb?: any) {
    let result = this._entries.filter(e => {
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
    this._entries = [];
    this.subscriptions = [];
    this.save();
    cb();
  }

  public isEmpty() {
    return this._entries.length === 0;
  }

  public first() {
    return this._entries[0];
  }

  public listSubscriptions() {
    return this.subscriptions;
  }
  
  private load() {
    try {
      let savedCache = JSON.parse(fs.readFileSync(SLS_TOKEN_FILE).toString());
      this._entries = savedCache._entries;
      this._entries.map(t => t.expiresOn = new Date(t.expiresOn))
      this.subscriptions = savedCache.subscriptions;
    } catch (e) {
      console.log("Error Loading");
    }
  }

  public save() {
    fs.writeFileSync(SLS_TOKEN_FILE, JSON.stringify({_entries: this._entries, subscriptions: this.subscriptions}));
  }
}
