import type { Command } from "commander";
import type { CommandContext } from "../shared.js";
import { getFormatter, requireOption, spin, withErrorHandling } from "../shared.js";
import { outputTable } from "../../utils/formatter.js";

interface ProjectsOptions {
  org?: string;
}

export function registerProjectsCommand(program: Command, context: CommandContext): void {
  program
    .command("projects")
    .description("List projects in an organization")
    .option("--org <identifier>", "Organization identifier (slug)")
    .addHelpText('after', `
EXAMPLES
  # List projects in a specific organization
  $ ellygent context projects --org acme-corp

  # List using default organization from config
  $ ellygent config set default-org acme-corp
  $ ellygent context projects

  # List as JSON
  $ ellygent context projects --org acme-corp --json

LEARN MORE
  Documentation: https://docs.ellygent.io/cli/context
  Use 'ellygent context orgs' to list available organizations
`)
    .action(
      withErrorHandling(async (options: ProjectsOptions, command) => {
        const formatter = getFormatter(command);
        const config = await context.configStore.load();
        const org = requireOption(
          options.org || config.defaultOrg,
          "--org",
          "`ellygent config set default-org <identifier>`"
        );
        const client = await context.clientFactory.contextClient();
        const projects = await spin("Loading projects", () => client.listProjects(org));
        outputTable(projects, ["identifier", "name", "description"], formatter);
      })
    );
}
