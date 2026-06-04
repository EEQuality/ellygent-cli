import type { Command } from "commander";
import type { CommandContext } from "../shared.js";
import { getFormatter, withErrorHandling } from "../shared.js";
import { outputSuccess, outputInfo } from "../../utils/formatter.js";

export function registerResetCommand(program: Command, context: CommandContext): void {
  program
    .command("reset")
    .description("Reset configuration to defaults (clears all values)")
    .addHelpText('after', `
EXAMPLES
  # Reset all configuration to defaults
  $ ellygent config reset

WARNING
  This will clear all configuration including credentials.
  You will need to run 'ellygent login --token <PAT>' again.

LEARN MORE
  Use 'ellygent config list' to see current configuration
`)
    .action(
      withErrorHandling(async (options, command) => {
        const formatter = getFormatter(command);
        
        // Save empty config (clears all values)
        await context.configStore.save({});
        
        outputSuccess("Configuration reset to defaults", formatter);
        outputInfo("Run 'ellygent login --token <PAT>' to re-authenticate", formatter);
      })
    );
}
