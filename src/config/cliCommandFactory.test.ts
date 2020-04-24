import { CliCommandFactory, CliCommand } from "./cliCommandFactory"

describe("Cli Command Factory", () => {
  it("registers a CLI command", () => {
    const testCommand: CliCommand = {
      command: "testCommand",
      args: [ "test", "args" ],
    }
    const factory = new CliCommandFactory();
    factory.registerCommand("test", testCommand);
    const result = factory.getCommand("test");
    expect(result.command).toEqual(testCommand.command);
    expect(result.args).toEqual(testCommand.args);
  });
});
