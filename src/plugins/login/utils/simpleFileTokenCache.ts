import fs from "fs";
import path from "path";
import os from "os";
import * as adal from "adal-node";

let CONFIG_DIRECTORY = path.join(os.homedir(), ".azure");
const DEFAULT_SLS_TOKEN_FILE = path.join(CONFIG_DIRECTORY, "slsTokenCache.json");

export class SimpleFileTokenCache implements adal.TokenCache {
  private entries: any[] = [];
  private subscriptions: any[] = [];

  public constructor(private tokenPath: string = DEFAULT_SLS_TOKEN_FILE) {
    if(tokenPath === DEFAULT_SLS_TOKEN_FILE && !fs.existsSync(CONFIG_DIRECTORY)) {
      CONFIG_DIRECTORY = path.join(os.homedir(), ".azure");
      this.tokenPath = CONFIG_DIRECTORY;
      fs.mkdirSync(CONFIG_DIRECTORY);
    }
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
    this.entries = (this.entries)
      ?
      this.entries.filter(e => {
        return !Object.keys(entries[0]).every(key => e[key] === entries[0][key]);
      })
      :
      [];
    this.save();
    if (callback) {
      callback();
    }
  }

  public find(query: any, callback: (err?: Error, result?: any[]) => void) {
    const result = (this.entries)
      ?
      this.entries.filter(e => {
        return Object.keys(query).every(key => e[key] === query[key]);
      })
      :
      [];
    callback(null, result);
    return result;
  }

  //-------- File toke cache specific methods

  public addSubs(subscriptions: any) {
    this.subscriptions.push(...subscriptions);
    this.subscriptions = this.subscriptions.reduce((accumulator, current) => {
      const x = accumulator.find(item => item.id === current.id);
      return (!x) ? accumulator.concat([current]) : accumulator;
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
    return !this.entries || this.entries.length === 0;
  }

  public first() {
    return (this.entries && this.entries.length) ? this.entries[0] : null;
  }

  public listSubscriptions() {
    return this.subscriptions;
  }

  private load() {
    if (!fs.existsSync(this.tokenPath)) {
      this.save();
      return;
    }
    const savedCache = JSON.parse(fs.readFileSync(this.tokenPath).toString());

    if (!savedCache || !savedCache.entries) {
      this.save();
      return;
    }
    this.entries = savedCache.entries;
    this.entries.map(t => t.expiresOn = new Date(t.expiresOn))
    this.subscriptions = savedCache.subscriptions;
  }

  public save() {
    fs.writeFileSync(this.tokenPath, JSON.stringify({ entries: this.entries, subscriptions: this.subscriptions }));
  }
}
