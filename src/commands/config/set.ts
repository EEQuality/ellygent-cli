import { input } from "@inquirer/prompts";
import type { Command } from "commander";
import type { ConfigKey } from "../../types/config.js";
import type { CommandContext } from "../shared.js";
import { getFormatter, withErrorHandling } from "../shared.js";
import { outputSuccess } from "../../utils/formatter.js";

const CONFIG_KEY_MAP: Record<string, ConfigKey> = {
  "api-url": "apiUrl",
  "access-token": "accessToken",
  "refresh-token": "refreshToken",
  "default-org": "defaultOrg",
  "default-project": "defaultProject"
};

export function registerSetCommand(program: Command, context: CommandContext): void {
  program
    .command("set")
    .description("Set a configuration value")
    .argument("<key>", "Configuration key (api-url, default-org, default-project, access-token, refresh-token)")
    .argument("[value]", "Value to store (will prompt if omitted)")
    .addHelpText('after', `
EXAMPLES
  # Set API URL
  $ ellygent config set api-url https://api.ellygent.io

  # Set default organization
  $ ellygent config set default-org acme-corp

  # Set value interactively (will prompt)
  $ ellygent config set default-project

  # Clear a value (set to empty string)
  $ ellygent config set default-org ""

LEARN MORE
  Use 'ellygent config get <key>' to view a value
  Use 'ellygent config list' to see all configuration
`)
    .action(
      withErrorHandling(async (rawKey: string, rawValue: string | undefined, options, command) => {
        const formatter = getFormatter(command);
        const key = CONFIG_KEY_MAP[rawKey];
        
        if (!key) {
          throw new Error(`Unsupported config key '${rawKey}'.`);
        }

        const value = rawValue ?? (await input({
          message: `Value for ${rawKey}`
        }));

        await context.configStore.set(key, value);
        outputSuccess(`Updated ${rawKey}`, formatter);
      })
    );
}
