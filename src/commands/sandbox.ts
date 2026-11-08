import type { Command } from "commander";
import { SandboxService } from "../services/sandboxService.js";
import { getOutputController, requireOption, withErrorHandling, type CommandContext } from "./shared.js";

export function registerSandboxCommands(program: Command, context: CommandContext): void {
  program.command("sandbox").description("Connect a read-only anonymous sandbox")
    .command("connect")
    .description("Pair this CLI with your sandbox browser session; requires a separate --config file")
    .requiredOption("--project <identifier>", "Sandbox project identifier")
    .option("--api-url <url>", "Ellygent server URL", "https://www.ellygent.com")
    .action(withErrorHandling(async (options: { project: string; apiUrl: string }, command: Command) => {
      const output = getOutputController(command);
      const result = await new SandboxService(context.configStore).connect({
        project: requireOption(options.project, "--project"), apiUrl: options.apiUrl
      }, instructions => {
        // Pairing instructions use stderr so stdout remains machine-readable and quiet mode can still pair.
        process.stderr.write(`Open ${instructions.verificationUri} in your sandbox browser.\nEnter code: ${instructions.userCode}\nApprove read-only access within ${instructions.expiresIn} seconds.\n`);
      });
      output.data({ connected: true, readOnly: true, ...result });
      output.complete();
    }));
}
