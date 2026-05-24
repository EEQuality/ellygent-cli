import type { Command } from "commander";
import type { CommandContext } from "../shared.js";
import { getFormatter, requireOption, spin, withErrorHandling } from "../shared.js";
import { outputTable } from "../../utils/formatter.js";

interface VersionsOptions {
  project?: string;
}

export function registerVersionsCommand(program: Command, context: CommandContext): void {
  program
    .command("versions")
    .description("List versions (live and baselines) for a project")
    .option("--project <identifier>", "Project identifier (alternative_id)")
    .addHelpText('after', `
EXAMPLES
  # List versions for a specific project
  $ ellygent context versions --project tractor_control

  # List using default project from config
  $ ellygent config set default-project tractor_control
  $ ellygent context versions

  # List as JSON
  $ ellygent context versions --project tractor_control --json

LEARN MORE
  Documentation: https://www.ellygent.com/cli/docs/commands
  Use 'ellygent context projects' to list available projects
`)
    .action(
      withErrorHandling(async (options: VersionsOptions, command) => {
        const formatter = getFormatter(command);
        const config = await context.configStore.load();
        const project = requireOption(
          options.project || config.defaultProject,
          "--project",
          "`ellygent config set default-project <identifier>`"
        );
        const client = await context.clientFactory.contextClient();
        const versions = await spin("Loading versions", () => client.listVersions(project));
        outputTable(versions, ["identifier", "name", "description", "type"], formatter);
      })
    );
}
