import type { Command } from "commander";
import { renderContentsTree } from "../../utils/tree.js";
import type { CommandContext } from "../shared.js";
import { getFormatter, requireOption, spin, withErrorHandling } from "../shared.js";
import { outputTree, outputSuccess } from "../../utils/formatter.js";

interface InspectOptions {
  project?: string;
  version?: string;
}

export function registerInspectCommand(program: Command, context: CommandContext): void {
  program
    .command("inspect")
    .description("Inspect exportable engineering context for a project version")
    .option("--project <identifier>", "Project identifier (alternative_id)")
    .option("--version <identifier>", "Version identifier", "main")
    .addHelpText('after', `
EXAMPLES
  # Inspect main version contents
  $ ellygent context inspect --project tractor_control

  # Inspect specific baseline version
  $ ellygent context inspect --project safety_system --version baseline-1.2.0

  # Inspect as JSON
  $ ellygent context inspect --project tractor_control --json

LEARN MORE
  Documentation: https://docs.ellygent.io/cli/context
  Use 'ellygent context versions' to list available versions
  Use 'ellygent context pull' to download context
`)
    .action(
      withErrorHandling(async (options: InspectOptions, command) => {
        const formatter = getFormatter(command);
        const config = await context.configStore.load();
        const project = requireOption(
          options.project || config.defaultProject,
          "--project",
          "`ellygent config set default-project <identifier>`"
        );
        const version = options.version || "main";
        const client = await context.clientFactory.contextClient();
        const contents = await spin("Loading context contents", () => 
          client.getContents(project, version)
        );
        
        if (formatter.format === "json") {
          outputTree(contents, formatter);
        } else {
          outputSuccess(`Context contents for ${project}@${version}`, formatter);
          renderContentsTree(contents);
        }
      })
    );
}
