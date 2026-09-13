import type { Command } from "commander";
import { MarkdownExportService } from "../../services/markdownExportService.js";
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
  scope?: "all" | "specifications" | "system-definition";
  overwrite?: boolean;
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

export function registerPullCommand(program: Command, context: CommandContext): void {
  program
    .command("pull")
    .description("Download engineering context or export Markdown / ReqIF")
    .option("--project <identifier>", "Project / ReqIF identifier (or configured default)")
    .option("--version <identifier>", "Live main or saved baseline identifier", "main")
    .option("--format <type>", "Export format: context (default), markdown, reqif, reqifz", "context")
    .option("--out <path>", "Markdown output file (.md) or directory; ReqIF/ReqIFZ output file")
    .option("--scope <scope>", "Markdown content: all, specifications, system-definition", "all")
    .option("--overwrite", "Replace existing Markdown output and its companion directory")
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

  # One specification, with companion assets/context in tractor.files/
  $ ellygent context pull --project tractor_control --spec functional_requirements --format markdown --out ./tractor.md

  # All specifications as separate documents, with index.md
  $ ellygent context pull --project tractor_control --format markdown --scope specifications --out ./docs

  # System-definition context (scenarios, constraints and recorded questions)
  $ ellygent context pull --project tractor_control --format markdown --scope system-definition --out ./system.md

  # All context from a saved baseline; explicitly replace an earlier export
  $ ellygent context pull --project tractor_control --version baseline-1.0.0 --format markdown --out ./baseline-docs --overwrite

  Markdown exports include available referenced project files with relative links.
  A .md output creates a sibling <name>.files/ directory; keep them together.
  --overwrite replaces the complete output directory (or file and companion).
  Missing assets produce export-report.md and exit code 2 (partial export).
  Baseline documents use current project-file bytes; assets are not versioned.
  External images are reported, not fetched; external hyperlinks stay external.

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
  Create a version in the web app, then select its identifier.
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
          const result = await spin(`Exporting Markdown ${project}@${version}`, () =>
            new MarkdownExportService(client).export({
              project, version, out: options.out!, scope: options.scope, overwrite: options.overwrite,
              selection: {
                specifications: options.spec, system_definitions: options.systemDefinition,
                include_traceability: options.includeTraceability, include_architecture: options.includeArchitecture,
                include_constraints: options.includeConstraints, include_glossary: options.includeGlossary,
                include_ai_summaries: options.includeAiSummaries,
              },
            })
          );
          if (result.report.status === "partial") {
            outputInfo(`Partial Markdown export written to ${result.outputPath}. See export-report.md.`, formatter);
            for (const issue of result.report.unavailable_assets) outputInfo(`${issue.reference}: ${issue.reason}`, formatter);
            process.exitCode = 2;
          } else {
            outputSuccess(`Markdown exported to ${result.outputPath}`, formatter);
          }
          outputInfo(`Version ${result.manifest.version.identifier} (${result.manifest.version.type})`, formatter);
          for (const limitation of result.report.limitations) outputInfo(limitation, formatter);
          return;
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
