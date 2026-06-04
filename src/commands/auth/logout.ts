import type { Command } from "commander";
import type { CommandContext } from "../shared.js";
import { getFormatter, withErrorHandling } from "../shared.js";
import { outputSuccess, outputInfo } from "../../utils/formatter.js";

export function registerLogoutCommand(program: Command, context: CommandContext): void {
  program
    .command("logout")
    .description("Clear stored credentials and log out")
    .addHelpText('after', `
EXAMPLES
  # Logout from current session
  $ ellygent auth logout

LEARN MORE
  Use 'ellygent login --token <PAT>' to authenticate again
`)
    .action(
      withErrorHandling(async (options, command) => {
        const formatter = getFormatter(command);
        const config = await context.configStore.load();
        
        if (!config.accessToken) {
          outputInfo("Not currently logged in", formatter);
          return;
        }
        
        const authType = "Personal Access Token";

        // Clear auth-related fields
        await context.configStore.set("accessToken", "");
        await context.configStore.set("refreshToken", "");
        
        outputSuccess(`Logged out successfully (${authType})`, formatter);
        outputInfo("Run 'ellygent login --token <PAT>' to re-authenticate", formatter);
      })
    );
}
