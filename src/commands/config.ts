import { input } from "@inquirer/prompts";
import type { Command } from "commander";
import type { ConfigKey } from "../types/config.js";
import { quietToken } from "../utils/terminal.js";
import type { CommandContext } from "./shared.js";
import { getFormatter, withErrorHandling } from "./shared.js";
import { outputTable, outputSuccess } from "../utils/formatter.js";

const CONFIG_KEY_MAP: Record<string, ConfigKey> = {
  "api-url": "apiUrl",
  "access-token": "accessToken",
  "refresh-token": "refreshToken",
  "default-org": "defaultOrg",
  "default-project": "defaultProject"
};

export function registerConfigCommand(program: Command, context: CommandContext): void {
  const config = program.command("config").description("Show or update local Ellygent CLI configuration");

  config.action(
    withErrorHandling(async (options, command) => {
      const formatter = getFormatter(command);
      const current = await context.configStore.load();
      outputTable(
        [
          { key: "api-url", value: current.apiUrl || "" },
          { key: "default-org", value: current.defaultOrg || "" },
          { key: "default-project", value: current.defaultProject || "" },
          { key: "access-token", value: quietToken(current.accessToken) },
          { key: "refresh-token", value: quietToken(current.refreshToken) },
          { key: "config-path", value: context.configStore.path }
        ],
        ["key", "value"],
        formatter
      );
    })
  );

  config
    .command("set")
    .description("Set a config value")
    .argument("<key>", "api-url, default-org, default-project, access-token, refresh-token")
    .argument("[value]", "Value to store")
    .action(
      withErrorHandling(async (rawKey: string, rawValue?: string, command?) => {
        const formatter = getFormatter(command);
        const key = CONFIG_KEY_MAP[rawKey];
        if (!key) {
          throw new Error(`Unsupported config key '${rawKey}'.`);
        }

        const value =
          rawValue ??
          (await input({
            message: `Value for ${rawKey}`
          }));

        await context.configStore.set(key, value);
        outputSuccess(`Updated ${rawKey}`, formatter);
      })
    );
}
