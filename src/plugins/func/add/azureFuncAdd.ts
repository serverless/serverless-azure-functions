import Serverless from 'serverless';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { FuncPluginUtils } from '../funcUtils'


export class AzureFuncAddPlugin {
  public hooks: { [eventName: string]: Promise<any> };
  public commands: any;

  constructor(private serverless: Serverless, private options: Serverless.Options) {

    this.commands = {
      func: {
        commands: {
          add: {
            usage: 'Add azure function',
            lifecycleEvents: [
              'add',
            ],
            options: {
              name: {
                usage: 'Name of function to add',
                shortcut: 'n',
              }
            }
          }
        }
      }
    }

    this.hooks = {
      'func:add:add': this.add.bind(this)
    };
  }

  private async add() {
    if (!('name' in this.options)) {
      this.serverless.cli.log('Need to provide a name of function to add');
      return;
    }
    const funcToAdd = this.options['name']
    const exists = fs.existsSync(funcToAdd);
    if (exists) {
      this.serverless.cli.log(`Function ${funcToAdd} already exists`);
      return;
    }
    this.createFunctionDir(funcToAdd);
    this.addToServerlessYml(funcToAdd);
  }

  private createFunctionDir(name: string) {
    this.serverless.cli.log('Creating function dir');
    fs.mkdirSync(name);
    fs.writeFileSync(path.join(name, 'index.js'), FuncPluginUtils.getFunctionHandler(name));
    fs.writeFileSync(path.join(name, 'function.json'), FuncPluginUtils.getFunctionJson(name, this.options))
  }

  private addToServerlessYml(name: string) {
    this.serverless.cli.log('Adding to serverless.yml');
    const functionYml = FuncPluginUtils.getFunctionsYml();
    functionYml.functions[name] = FuncPluginUtils.getFunctionSlsObject(name, this.options);
    FuncPluginUtils.updateFunctionsYml(functionYml);
  } 
}