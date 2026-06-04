import type { Command } from "commander";
import type { CommandContext } from "./shared.js";
import { withErrorHandling } from "./shared.js";
import { showAuthStatus } from "./auth/status.js";

export function registerWhoAmICommand(program: Command, context: CommandContext): void {
  program
    .command("whoami")
    .description("Show current authentication status")
    .addHelpText("after", `
EXAMPLES
  # Check authentication status
  $ ellygent whoami

  # Get status as JSON
  $ ellygent whoami --json

LEARN MORE
  Use 'ellygent auth login --token <PAT>' to authenticate
  Use 'ellygent auth logout' to clear credentials
`)
    .action(withErrorHandling(async (_options, command) => {
      await showAuthStatus(context, command);
    }));
}
