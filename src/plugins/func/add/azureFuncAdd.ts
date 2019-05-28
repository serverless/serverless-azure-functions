import Serverless from 'serverless';

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
            ]
          }
        }
      }
    }

    this.hooks = {
      'func:add:add': this.add.bind(this)
    };
  }

  private async add() {
    this.serverless.cli.log('Got to add');
  }
}