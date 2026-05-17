import type { Command } from "commander";
import { AuthService } from "../services/authService.js";
import { printSuccess } from "../utils/terminal.js";
import type { CommandContext } from "./shared.js";
import { withErrorHandling } from "./shared.js";

interface LoginCommandOptions {
  apiUrl?: string;
  email?: string;
  pat?: string;
}

export function registerLoginCommand(program: Command, context: CommandContext): void {
  program
    .command("login")
    .description("Authenticate with Ellygent and store local CLI credentials")
    .option("--api-url <url>", "Ellygent API URL")
    .option("--email <email>", "Ellygent user email (for email/password auth)")
    .option("--pat <token>", "Personal Access Token (alternative to email/password)")
    .action(
      withErrorHandling(async (options: LoginCommandOptions) => {
        const result = await new AuthService(context.configStore).login({
          apiUrl: options.apiUrl,
          email: options.email,
          password: process.env.ELLYGENT_PASSWORD,
          pat: options.pat || process.env.ELLYGENT_PAT
        });
        
        if (result.email) {
          printSuccess(`Logged in as ${result.email} (${result.apiUrl})`);
        } else {
          printSuccess(`Logged in with Personal Access Token (${result.apiUrl})`);
        }
      })
    );
}
