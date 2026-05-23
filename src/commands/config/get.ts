import type { Command } from "commander";
import type { CommandContext } from "../shared.js";
import { getFormatter, withErrorHandling } from "../shared.js";
import { outputData, outputInfo } from "../../utils/formatter.js";

const CONFIG_KEY_MAP: Record<string, string> = {
  "api-url": "apiUrl",
  "access-token": "accessToken",
  "refresh-token": "refreshToken",
  "default-org": "defaultOrg",
  "default-project": "defaultProject"
};

export function registerGetCommand(program: Command, context: CommandContext): void {
  program
    .command("get")
    .description("Get a configuration value")
    .argument("<key>", "Configuration key (api-url, default-org, default-project, access-token, refresh-token)")
    .addHelpText('after', `
EXAMPLES
  # Get API URL
  $ ellygent config get api-url

  # Get default organization
  $ ellygent config get default-org

  # Get value as JSON
  $ ellygent config get api-url --json

LEARN MORE
  Use 'ellygent config list' to see all configuration
  Use 'ellygent config set <key> <value>' to update configuration
`)
    .action(
      withErrorHandling(async (rawKey: string, options, command) => {
        const formatter = getFormatter(command);
        const key = CONFIG_KEY_MAP[rawKey];
        
        if (!key) {
          throw new Error(`Unsupported config key '${rawKey}'.`);
        }

        const config = await context.configStore.load();
        const value = (config as Record<string, unknown>)[key];
        
        if (formatter.format === "json") {
          outputData({ key: rawKey, value: value || null }, formatter);
        } else {
          if (value) {
            // Mask tokens for security
            if (rawKey.includes("token") && typeof value === "string") {
              outputInfo("<configured>", formatter);
            } else {
              outputInfo(String(value), formatter);
            }
          } else {
            outputInfo("(not set)", formatter);
          }
        }
      })
    );
}
