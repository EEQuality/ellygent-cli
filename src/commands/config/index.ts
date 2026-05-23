import type { Command } from "commander";
import type { CommandContext } from "../shared.js";
import { registerGetCommand } from "./get.js";
import { registerSetCommand } from "./set.js";
import { registerListCommand } from "./list.js";
import { registerResetCommand } from "./reset.js";

export function registerConfigCommands(program: Command, context: CommandContext): void {
  const config = program
    .command("config")
    .description("Manage CLI configuration");

  // Make 'list' the default action when no subcommand specified
  config.action(async () => {
    await config.parseAsync(["list"], { from: "user" });
  });

  registerGetCommand(config, context);
  registerSetCommand(config, context);
  registerListCommand(config, context);
  registerResetCommand(config, context);
}
