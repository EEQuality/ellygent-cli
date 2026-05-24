import type { Command } from "commander";
import { SyncService } from "../../services/syncService.js";
import type { CommandContext } from "../shared.js";
import { getFormatter, requireOption, spin, withErrorHandling } from "../shared.js";
import { outputSuccess, outputInfo } from "../../utils/formatter.js";

interface PullOptions {
  project?: string;
  version?: string;
  spec?: string[];
  systemDefinition?: string[];
  includeTraceability?: boolean;
  includeArchitecture?: boolean;
  includeConstraints?: boolean;
  includeGlossary?: boolean;
  includeAiSummaries?: boolean;
  workspace?: string;
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

export function registerPullCommand(program: Command, context: CommandContext): void {
  program
    .command("pull")
    .description("Download engineering context package to local workspace")
    .option("--project <identifier>", "Project identifier (alternative_id)")
    .option("--version <identifier>", "Version identifier", "main")
    .option("--spec <identifier>", "Specification identifier to include (repeatable)", collect, [])
    .option("--system-definition <identifier>", "System definition identifier to include (repeatable)", collect, [])
    .option("--include-traceability", "Include traceability mappings")
    .option("--include-architecture", "Include architecture/system-definition context")
    .option("--include-constraints", "Include constraints context")
    .option("--include-glossary", "Include glossary")
    .option("--include-ai-summaries", "Include AI summary files")
    .option("--workspace <path>", "Target workspace directory", process.cwd())
    .addHelpText('after', `
EXAMPLES
  # Pull main version to current directory
  $ ellygent context pull --project tractor_control

  # Pull specific baseline with all context
  $ ellygent context pull \\
      --project safety_system \\
      --version baseline-1.2.0 \\
      --include-traceability \\
      --include-glossary

  # Pull specific specifications only
  $ ellygent context pull \\
      --project tractor_control \\
      --spec functional_requirements \\
      --spec safety_requirements

  # Pull to custom directory
  $ ellygent context pull --project tractor_control --workspace ./context/

  # Pull as JSON (for automation)
  $ ellygent context pull --project tractor_control --json

LEARN MORE
  Documentation: https://www.ellygent.com/cli/docs/commands
  Use 'ellygent context inspect' to preview available content
`)
    .action(
      withErrorHandling(async (options: PullOptions, command) => {
        const formatter = getFormatter(command);
        const config = await context.configStore.load();
        const project = requireOption(
          options.project || config.defaultProject,
          "--project",
          "`ellygent config set default-project <identifier>`"
        );
        const version = options.version || "main";
        const client = await context.clientFactory.contextClient();

        const result = await spin(`Syncing ${project}@${version}`, () =>
          new SyncService(client).sync({
            project,
            version,
            workspace: options.workspace,
            specs: options.spec,
            systemDefinitions: options.systemDefinition,
            includeTraceability: options.includeTraceability,
            includeArchitecture: options.includeArchitecture,
            includeConstraints: options.includeConstraints,
            includeGlossary: options.includeGlossary,
            includeAiSummaries: options.includeAiSummaries
          })
        );

        outputSuccess(`Context pulled to ${result.targetDir}`, formatter);
        outputInfo(`${result.manifest.project.name} (${result.manifest.project.identifier})`, formatter);
        outputInfo(`Version ${result.manifest.version.identifier} - generated ${result.manifest.generated_at}`, formatter);
      })
    );
}
