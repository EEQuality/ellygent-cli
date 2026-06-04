import type { Command } from "commander";
import { AuthService } from "../../services/authService.js";
import type { CommandContext } from "../shared.js";
import { getFormatter, withErrorHandling } from "../shared.js";
import { outputSuccess } from "../../utils/formatter.js";
import { formatExamples, formatLearnMore } from "../../utils/help.js";

interface LoginOptions {
  apiUrl?: string;
  token?: string;
}

export function registerLoginCommand(program: Command, context: CommandContext): void {
  program
    .command("login")
    .description("Authenticate with Ellygent using a Personal Access Token")
    .option("--api-url <url>", "Ellygent API URL")
    .option("--token <token>", "Personal Access Token")
    .addHelpText('after', 
      formatExamples([
        {
          description: "Interactive login with PAT prompt",
          command: "ellygent auth login"
        },
        {
          description: "Login with API URL",
          command: "ellygent auth login --api-url https://api.ellygent.io"
        },
        {
          description: "Login with Personal Access Token",
          command: "ellygent auth login --api-url https://api.ellygent.io --token elly_pat_xxx"
        }
      ]) +
      `\n${"\x1b[1m"}ENVIRONMENT VARIABLES${"\x1b[0m"}\n  ELLYGENT_TOKEN     Personal Access Token (alternative to --token flag)\n` +
      formatLearnMore([
        "Documentation: https://www.ellygent.com/cli/docs/authentication",
        "Use 'ellygent auth --help' for all auth commands"
      ])
    )
    .action(
      withErrorHandling(async (options: LoginOptions, command) => {
        const formatter = getFormatter(command);
        const result = await new AuthService(context.configStore).login({
          apiUrl: options.apiUrl,
          token: options.token || process.env.ELLYGENT_TOKEN
        });

        outputSuccess(`Logged in with Personal Access Token (${result.apiUrl})`, formatter);
      })
    );
}
