import type { Command } from "commander";
import { AuthService } from "../../services/authService.js";
import type { CommandContext } from "../shared.js";
import { getFormatter, withErrorHandling } from "../shared.js";
import { outputSuccess } from "../../utils/formatter.js";
import { formatExamples, formatLearnMore } from "../../utils/help.js";

interface LoginOptions {
  apiUrl?: string;
  email?: string;
  pat?: string;
}

export function registerLoginCommand(program: Command, context: CommandContext): void {
  program
    .command("login")
    .description("Authenticate with Ellygent and store credentials")
    .option("--api-url <url>", "Ellygent API URL")
    .option("--email <email>", "User email (for email/password auth)")
    .option("--pat <token>", "Personal Access Token (for PAT auth)")
    .addHelpText('after', 
      formatExamples([
        {
          description: "Interactive login with browser prompts",
          command: "ellygent auth login"
        },
        {
          description: "Login with API URL",
          command: "ellygent auth login --api-url https://api.ellygent.io"
        },
        {
          description: "Login with Personal Access Token",
          command: "ellygent auth login --api-url https://api.ellygent.io --pat elly_pat_xxx"
        },
        {
          description: "Login with email/password (requires ELLYGENT_PASSWORD env var)",
          command: "ELLYGENT_PASSWORD='***' ellygent auth login --api-url https://api.ellygent.io --email user@example.com"
        }
      ]) +
      `\n${"\x1b[1m"}ENVIRONMENT VARIABLES${"\x1b[0m"}\n  ELLYGENT_PASSWORD  Password for email/password authentication\n  ELLYGENT_PAT       Personal Access Token (alternative to --pat flag)\n` +
      formatLearnMore([
        "Documentation: https://docs.ellygent.io/cli/auth",
        "Use 'ellygent auth --help' for all auth commands"
      ])
    )
    .action(
      withErrorHandling(async (options: LoginOptions, command) => {
        const formatter = getFormatter(command);
        const result = await new AuthService(context.configStore).login({
          apiUrl: options.apiUrl,
          email: options.email,
          password: process.env.ELLYGENT_PASSWORD,
          pat: options.pat || process.env.ELLYGENT_PAT
        });
        
        if (result.email) {
          outputSuccess(`Logged in as ${result.email} (${result.apiUrl})`, formatter);
        } else {
          outputSuccess(`Logged in with Personal Access Token (${result.apiUrl})`, formatter);
        }
      })
    );
}
