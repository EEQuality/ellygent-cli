import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ContextExportSelection, PackageManifest } from "../types/context.js";
import { ContextApiClient } from "../api/contextApiClient.js";
import { PackageExtractor } from "./packageExtractor.js";
import { resolveWorkspacePath } from "../utils/workspace.js";

export interface SyncOptions {
  project: string;
  version: string;
  workspace?: string;
  specs?: string[];
  systemDefinitions?: string[];
  includeTraceability?: boolean;
  includeArchitecture?: boolean;
  includeConstraints?: boolean;
  includeGlossary?: boolean;
  includeAiSummaries?: boolean;
}

export interface SyncResult {
  manifest: PackageManifest;
  targetDir: string;
}

export class SyncService {
  constructor(
    private readonly contextClient: ContextApiClient,
    private readonly extractor = new PackageExtractor()
  ) {}

  async sync(options: SyncOptions): Promise<SyncResult> {
    const workspace = resolveWorkspacePath(options.workspace);
    const tempRoot = await mkdtemp(join(tmpdir(), "ellygent-context-"));
    const zipPath = join(tempRoot, "context.zip");

    try {
      await this.contextClient.downloadContextPackage(
        {
          project_identifier: options.project,
          version_identifier: options.version,
          selection: buildSelection(options),
          format: "zip"
        },
        zipPath
      );

      return await this.extractor.extract(zipPath, workspace, tempRoot);
    } finally {
      await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

function buildSelection(options: SyncOptions): ContextExportSelection {
  return {
    specifications: options.specs ?? [],
    system_definitions: options.systemDefinitions ?? [],
    include_traceability: Boolean(options.includeTraceability),
    include_architecture: Boolean(options.includeArchitecture),
    include_constraints: Boolean(options.includeConstraints),
    include_glossary: Boolean(options.includeGlossary),
    include_ai_summaries: Boolean(options.includeAiSummaries)
  };
}
