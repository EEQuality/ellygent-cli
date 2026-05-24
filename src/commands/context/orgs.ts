import type { Command } from "commander";
import type { CommandContext } from "../shared.js";
import { getFormatter, spin, withErrorHandling } from "../shared.js";
import { outputTable } from "../../utils/formatter.js";

export function registerOrgsCommand(program: Command, context: CommandContext): void {
  program
    .command("orgs")
    .description("List organizations accessible to the authenticated user")
    .addHelpText('after', `
EXAMPLES
  # List all organizations
  $ ellygent context orgs

  # List as JSON for scripting
  $ ellygent context orgs --json

  # List in markdown table format
  $ ellygent context orgs --format markdown

LEARN MORE
  Documentation: https://www.ellygent.com/cli/docs/commands
  Use 'ellygent context --help' for all context commands
`)
    .action(
      withErrorHandling(async (options, command) => {
        const formatter = getFormatter(command);
        const client = await context.clientFactory.contextClient();
        const orgs = await spin("Loading organizations", () => client.listOrganizations());
        outputTable(orgs, ["identifier", "name"], formatter);
      })
    );
}
