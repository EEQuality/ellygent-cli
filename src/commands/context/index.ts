import type { Command } from "commander";
import type { CommandContext } from "../shared.js";
import { registerOrgsCommand } from "./orgs.js";
import { registerProjectsCommand } from "./projects.js";
import { registerVersionsCommand } from "./versions.js";
import { registerInspectCommand } from "./inspect.js";
import { registerPullCommand } from "./pull.js";

export function registerContextCommands(program: Command, context: CommandContext): void {
  const contextCmd = program
    .command("context")
    .description("Manage engineering context (organizations, projects, versions)");

  registerOrgsCommand(contextCmd, context);
  registerProjectsCommand(contextCmd, context);
  registerVersionsCommand(contextCmd, context);
  registerInspectCommand(contextCmd, context);
  registerPullCommand(contextCmd, context);
}
