import type { Command } from "commander";
import { renderContentsTree } from "../utils/tree.js";
import { printSuccess } from "../utils/terminal.js";
import type { CommandContext } from "./shared.js";
import { getFormatter, requireOption, spin, withErrorHandling } from "./shared.js";
import { outputTable, outputTree, outputSuccess } from "../utils/formatter.js";

interface ProjectsOptions {
  org?: string;
}

interface ProjectOptions {
  project?: string;
}

interface ContentsOptions extends ProjectOptions {
  version?: string;
}

export function registerDiscoveryCommands(program: Command, context: CommandContext): void {
  program
    .command("orgs")
    .description("List Ellygent organizations accessible to the authenticated user")
    .action(
      withErrorHandling(async (options, command) => {
        const formatter = getFormatter(command);
        const client = await context.clientFactory.contextClient();
        const orgs = await spin("Loading organizations", () => client.listOrganizations());
        outputTable(orgs, ["identifier", "name"], formatter);
      })
    );

  program
    .command("projects")
    .description("List projects in an Ellygent organization")
    .option("--org <identifier>", "Organization identifier (slug)")
    .action(
      withErrorHandling(async (options: ProjectsOptions, command) => {
        const formatter = getFormatter(command);
        const config = await context.configStore.load();
        const org = requireOption(options.org || config.defaultOrg, "--org", "`ellygent config set default-org <identifier>`");
        const client = await context.clientFactory.contextClient();
        const projects = await spin("Loading projects", () => client.listProjects(org));
        outputTable(projects, ["identifier", "name", "description"], formatter);
      })
    );

  program
    .command("versions")
    .description("List live and baseline versions for a project")
    .option("--project <identifier>", "Project identifier (alternative_id)")
    .action(
      withErrorHandling(async (options: ProjectOptions, command) => {
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

  program
    .command("contents")
    .description("Inspect exportable engineering context for a project version")
    .option("--project <identifier>", "Project identifier (alternative_id)")
    .option("--version <identifier>", "Version identifier", "main")
    .action(
      withErrorHandling(async (options: ContentsOptions, command) => {
        const formatter = getFormatter(command);
        const config = await context.configStore.load();
        const project = requireOption(
          options.project || config.defaultProject,
          "--project",
          "`ellygent config set default-project <identifier>`"
        );
        const version = options.version || "main";
        const client = await context.clientFactory.contextClient();
        const contents = await spin("Loading context contents", () => client.getContents(project, version));
        
        if (formatter.format === "json") {
          outputTree(contents, formatter);
        } else {
          outputSuccess(`Context contents for ${project}@${version}`, formatter);
          renderContentsTree(contents);
        }
      })
    );
}
