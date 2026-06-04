import type { Command } from "commander";
import { AuthService } from "../services/authService.js";
import type { CommandContext } from "./shared.js";
import { getFormatter, withErrorHandling } from "./shared.js";
import { outputSuccess } from "../utils/formatter.js";

interface LoginCommandOptions {
  url?: string;
  apiUrl?: string;
  token?: string;
}

export function registerLoginCommand(program: Command, context: CommandContext): void {
  program
    .command("login")
    .description("Authenticate with Ellygent using a Personal Access Token")
    .option("--url <url>", "Ellygent server URL")
    .option("--api-url <url>", "Deprecated alias for --url")
    .option("--token <token>", "Personal Access Token")
    .action(
      withErrorHandling(async (options: LoginCommandOptions, command) => {
        const formatter = getFormatter(command);
        const result = await new AuthService(context.configStore).login({
          apiUrl: options.url || options.apiUrl,
          token: options.token || process.env.ELLYGENT_TOKEN
        });

        outputSuccess(`Logged in with Personal Access Token (${result.apiUrl})`, formatter);
      })
    );
}
