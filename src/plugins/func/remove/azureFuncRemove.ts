import Serverless from 'serverless';

export class AzureFuncRemovePlugin {
  public hooks: { [eventName: string]: Promise<any> };
  public commands: any;

  constructor(private serverless: Serverless, private options: Serverless.Options) {

    this.commands = {
      func: {
        commands: {
          remove: {
            usage: 'Remove azure function',
            lifecycleEvents: [
              'remove',
            ]
          }
        }
      }
    }

    this.hooks = {
      'func:remove:remove': this.remove.bind(this)
    };
  }

  private async remove() {
    this.serverless.cli.log('Got to remove');
  }
}