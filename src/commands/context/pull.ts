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
  format?: string;
  out?: string;
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

export function registerPullCommand(program: Command, context: CommandContext): void {
  program
    .command("pull")
    .description("Download engineering context package to local workspace")
    .option("--format <type>", "Export format: context (default), markdown, reqif, reqifz", "context")
    .option("--out <path>", "Output file path (for reqif/reqifz/markdown formats)")
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

  # Export as ReqIF (requires specific version)
  $ ellygent context pull \\
      --project tractor_control \\
      --version baseline-1.0.0 \\
      --format reqif \\
      --out ./tractor-baseline-1.0.0.reqif

  # Export as ReqIFZ archive (requires specific version)
  $ ellygent context pull \\
      --project safety_system \\
      --version v2.1.0 \\
      --format reqifz \\
      --out ./safety-v2.1.0.reqifz

  # Export as Markdown
  $ ellygent context pull \\
      --project tractor_control \\
      --version baseline-1.0.0 \\
      --format markdown \\
      --out ./tractor.md

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

IMPORTANT: ReqIF and ReqIFZ exports require a specific project version.
  Exporting from MAIN or live state is not allowed for ReqIF formats.
  Create a version first: 'ellygent versions create --project <project> --name <name>'
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
        const format = (options.format || "context").toLowerCase();

        // Validate format
        const validFormats = ["context", "markdown", "md", "reqif", "reqifz"];
        if (!validFormats.includes(format)) {
          throw new Error(
            `Invalid format: ${format}. Valid formats: ${validFormats.join(", ")}`
          );
        }

        // ReqIF formats MUST have a specific version (not MAIN)
        if (format === "reqif" || format === "reqifz") {
          if (!options.version || version.toLowerCase() === "main") {
            throw new Error(
              "ReqIF export requires a specific project version.\n" +
              "Exporting ReqIF from MAIN is not allowed.\n" +
              "\n" +
              "Create or select a project version and retry with --version <version-identifier>\n" +
              "\n" +
              "Example:\n" +
              `  ellygent pull --project ${project} --version <version> --format ${format} --out ./project.${format}`
            );
          }
        }

        const client = await context.clientFactory.contextClient();

        // Handle ReqIF/ReqIFZ export
        if (format === "reqif" || format === "reqifz") {
          const outputPath = requireOption(
            options.out,
            "--out",
            "Output file path is required for ReqIF exports"
          );

          await spin(`Exporting ${project}@${version} as ${format.toUpperCase()}`, () =>
            client.downloadReqIFExport(project, format as "reqif" | "reqifz", version, outputPath)
          );

          outputSuccess(`${format.toUpperCase()} exported to ${outputPath}`, formatter);
          outputInfo(`${project}@${version}`, formatter);
          return;
        }

        // Handle markdown export
        if (format === "markdown" || format === "md") {
          if (!options.out) {
            throw new Error("--out option is required for markdown format");
          }
          // TODO: Implement markdown export via legacy export endpoint
          throw new Error("Markdown export format is not yet implemented via CLI");
        }

        // Handle context package export (default)
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
