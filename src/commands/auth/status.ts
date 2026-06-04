import type { Command } from "commander";
import { ContextApiClient } from "../../api/contextApiClient.js";
import type { CommandContext } from "../shared.js";
import { getOutputController, withErrorHandling } from "../shared.js";

export async function showAuthStatus(context: CommandContext, command: Command): Promise<void> {
  const output = getOutputController(command);

  output.debug("Loading configuration");
  const config = await context.configStore.load();

  if (!config.accessToken) {
    if (output.isJson()) {
      output.data({ configured: false, authenticated: false, apiUrl: config.apiUrl || "not set" });
      output.complete();
    } else {
      output.info("Not authenticated");
      output.info("Configured: no");
      output.info("Authenticated: no");
      output.info("Run 'ellygent auth login --token <PAT>' to authenticate");
    }
    return;
  }

  const apiUrl = config.apiUrl || "not set";
  const tokenType = "Personal Access Token";

  if (!config.apiUrl) {
    const statusData = {
      configured: false,
      authenticated: false,
      apiUrl,
      tokenType,
      defaultOrg: config.defaultOrg || "not set",
      defaultProject: config.defaultProject || "not set"
    };

    if (output.isJson()) {
      output.data(statusData);
    } else {
      output.warn("Server URL is not configured");
      output.info("Configured: no");
      output.info("Authenticated: no");
      output.info(`Token type: ${statusData.tokenType}`);
      output.info(`API base URL: ${statusData.apiUrl}`);
    }

    output.complete();
    return;
  }

  if (config.apiUrl) {
    output.debug("Validating Personal Access Token against authenticated endpoint");
    await new ContextApiClient(config.apiUrl, config.accessToken).listOrganizations();
  }

  const statusData = {
    configured: Boolean(config.apiUrl),
    authenticated: true,
    apiUrl,
    tokenType,
    defaultOrg: config.defaultOrg || "not set",
    defaultProject: config.defaultProject || "not set"
  };

  output.debug("Authentication status:", statusData);

  if (output.isJson()) {
    output.data(statusData);
  } else {
    output.success("Authenticated");
    output.info("Configured: yes");
    output.info("Authenticated: yes");
    output.info(`API base URL: ${statusData.apiUrl}`);
    output.info(`Token type: ${statusData.tokenType}`);
    if (config.defaultOrg) {
      output.info(`Default organization: ${config.defaultOrg}`);
    }
    if (config.defaultProject) {
      output.info(`Default project: ${config.defaultProject}`);
    }
  }

  output.complete();
}

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
  Use 'ellygent auth login --token <PAT>' to authenticate
  Use 'ellygent auth logout' to clear credentials
`)
    .action(withErrorHandling(async (_options, command) => {
      await showAuthStatus(context, command);
    }));
}
