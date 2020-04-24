export interface CliCommand {
  command: string;
  args: string[];
}

export class CliCommandFactory {

  private commands: { [id: string]: CliCommand }

  public constructor() {
    this.commands = {};
  }

  public registerCommand(key: string, command: CliCommand) {
    this.commands[key] = command;
  }

  public getCommand(key: string): CliCommand {
    return this.commands[key];
  }
}