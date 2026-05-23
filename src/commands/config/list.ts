import type { Command } from "commander";
import { quietToken } from "../../utils/terminal.js";
import type { CommandContext } from "../shared.js";
import { getFormatter, withErrorHandling } from "../shared.js";
import { outputTable } from "../../utils/formatter.js";
import { loadFromEnv } from "../../config/configStore.js";

export function registerListCommand(program: Command, context: CommandContext): void {
  program
    .command("list")
    .description("List all configuration values")
    .addHelpText('after', `
EXAMPLES
  # List all configuration
  $ ellygent config list

  # List as JSON
  $ ellygent config list --json

LEARN MORE
  Use 'ellygent config get <key>' to view a specific value
  Use 'ellygent config set <key> <value>' to update configuration
`)
    .action(
      withErrorHandling(async (options, command) => {
        const formatter = getFormatter(command);
        const current = await context.configStore.load();
        const envConfig = loadFromEnv();
        
        // Helper to determine source
        const source = (key: keyof typeof envConfig) => {
          if (envConfig[key]) return "env";
          if (current[key]) return "file";
          return "";
        };
        
        outputTable(
          [
            { 
              key: "api-url", 
              value: current.apiUrl || "", 
              source: source("apiUrl")
            },
            { 
              key: "default-org", 
              value: current.defaultOrg || "", 
              source: source("defaultOrg")
            },
            { 
              key: "default-project", 
              value: current.defaultProject || "", 
              source: source("defaultProject")
            },
            { 
              key: "access-token", 
              value: quietToken(current.accessToken),
              source: source("accessToken")
            },
            { 
              key: "refresh-token", 
              value: quietToken(current.refreshToken),
              source: ""  // refresh token not supported via env
            },
            { 
              key: "config-path", 
              value: context.configStore.path,
              source: ""
            }
          ],
          ["key", "value", "source"],
          formatter
        );
      })
    );
}
