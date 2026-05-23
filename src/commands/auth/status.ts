import type { Command } from "commander";
import type { CommandContext } from "../shared.js";
import { getOutputController, withErrorHandling } from "../shared.js";

export function registerStatusCommand(program: Command, context: CommandContext): void {
  program
    .command("status")
    .description("Show current authentication status")
    .addHelpText('after', `
EXAMPLES
  # Check authentication status
  $ ellygent auth status

  # Get status as JSON
  $ ellygent auth status --json

  # Get status with debug information
  $ ellygent auth status --debug

LEARN MORE
  Use 'ellygent auth login' to authenticate
  Use 'ellygent auth logout' to clear credentials
`)
    .action(
      withErrorHandling(async (options, command) => {
        const output = getOutputController(command);
        
        output.debug("Loading configuration");
        const config = await context.configStore.load();
        
        if (!config.accessToken) {
          if (output.isJson()) {
            output.data({ authenticated: false });
            output.complete();
          } else {
            output.info("Not authenticated");
            output.info("Run 'ellygent auth login' to authenticate");
          }
          return;
        }
        
        const isPAT = config.accessToken.startsWith("elly_pat_");
        const tokenType = isPAT ? "Personal Access Token" : "JWT";
        
        const statusData = {
          authenticated: true,
          apiUrl: config.apiUrl || "not set",
          tokenType,
          hasRefreshToken: !!config.refreshToken,
          defaultOrg: config.defaultOrg || "not set",
          defaultProject: config.defaultProject || "not set"
        };
        
        output.debug("Authentication status:", statusData);
        
        if (output.isJson()) {
          output.data(statusData);
        } else {
          output.success("Authenticated");
          output.info(`API URL: ${statusData.apiUrl}`);
          output.info(`Token type: ${statusData.tokenType}`);
          if (config.defaultOrg) {
            output.info(`Default organization: ${config.defaultOrg}`);
          }
          if (config.defaultProject) {
            output.info(`Default project: ${config.defaultProject}`);
          }
        }
        
        output.complete();
      })
    );
}
