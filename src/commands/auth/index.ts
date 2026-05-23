import type { Command } from "commander";
import type { CommandContext } from "../shared.js";
import { registerLoginCommand } from "./login.js";
import { registerLogoutCommand } from "./logout.js";
import { registerStatusCommand } from "./status.js";

export function registerAuthCommands(program: Command, context: CommandContext): void {
  const auth = program
    .command("auth")
    .description("Authenticate with Ellygent and manage credentials");

  registerLoginCommand(auth, context);
  registerLogoutCommand(auth, context);
  registerStatusCommand(auth, context);
}
