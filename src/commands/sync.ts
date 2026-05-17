import type { Command } from "commander";
import { SyncService } from "../services/syncService.js";
import { printInfo, printSuccess } from "../utils/terminal.js";
import type { CommandContext } from "./shared.js";
import { requireOption, spin, withErrorHandling } from "./shared.js";

interface SyncCommandOptions {
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

export function registerSyncCommand(program: Command, context: CommandContext): void {
  program
    .command("sync")
    .description("Download and extract an Ellygent engineering context package into ./.ellygent/")
    .option("--project <identifier>", "Project identifier (alternative_id)")
    .option("--version <identifier>", "Version identifier", "main")
    .option("--spec <identifier>", "Specification identifier to include; repeatable", collect, [])
    .option("--system-definition <identifier>", "System definition identifier to include; repeatable", collect, [])
    .option("--include-traceability", "Include traceability mappings")
    .option("--include-architecture", "Include architecture/system-definition context")
    .option("--include-constraints", "Include constraints context")
    .option("--include-glossary", "Include glossary context")
    .option("--include-ai-summaries", "Include AI summary files")
    .option("--workspace <path>", "Workspace directory", process.cwd())
    .action(
      withErrorHandling(async (options: SyncCommandOptions) => {
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

        printSuccess(`Context synced to ${result.targetDir}`);
        printInfo(`${result.manifest.project.name} (${result.manifest.project.identifier})`);
        printInfo(`Version ${result.manifest.version.identifier} - generated ${result.manifest.generated_at}`);
      })
    );
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}
