import { input } from "@inquirer/prompts";
import type { Command } from "commander";
import type { ConfigKey } from "../types/config.js";
import { printSuccess, quietToken, renderTable } from "../utils/terminal.js";
import type { CommandContext } from "./shared.js";
import { withErrorHandling } from "./shared.js";

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
    withErrorHandling(async () => {
      const current = await context.configStore.load();
      renderTable(
        [
          { key: "api-url", value: current.apiUrl || "" },
          { key: "default-org", value: current.defaultOrg || "" },
          { key: "default-project", value: current.defaultProject || "" },
          { key: "access-token", value: quietToken(current.accessToken) },
          { key: "refresh-token", value: quietToken(current.refreshToken) },
          { key: "config-path", value: context.configStore.path }
        ],
        ["key", "value"]
      );
    })
  );

  config
    .command("set")
    .description("Set a config value")
    .argument("<key>", "api-url, default-org, default-project, access-token, refresh-token")
    .argument("[value]", "Value to store")
    .action(
      withErrorHandling(async (rawKey: string, rawValue?: string) => {
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
        printSuccess(`Updated ${rawKey}`);
      })
    );
}
