import AdmZip from "adm-zip";
import { lstat, mkdir, mkdtemp, readFile, rename, rm } from "node:fs/promises";
import { basename, dirname, extname, join, resolve, sep } from "node:path";
import type { ContextApiClient } from "../api/contextApiClient.js";
import type { ContextExportSelection, PackageManifest } from "../types/context.js";
import { PackageExtractor } from "./packageExtractor.js";

export interface MarkdownExportOptions {
  project: string;
  version: string;
  out: string;
  scope?: "all" | "specifications" | "system-definition";
  overwrite?: boolean;
  selection: ContextExportSelection;
}

export interface MarkdownExportReport {
  status: "complete" | "partial";
  unavailable_assets: Array<{ document: string; reference: string; reason: string }>;
  limitations: string[];
}

export interface MarkdownExportResult {
  outputPath: string;
  manifest: PackageManifest;
  report: MarkdownExportReport;
}

/** Stage downloads on the destination filesystem, validate, then publish with rollback. */
export class MarkdownExportService {
  constructor(private readonly client: ContextApiClient) {}

  async export(options: MarkdownExportOptions): Promise<MarkdownExportResult> {
    const outputPath = resolve(options.out);
    const single = extname(outputPath).toLowerCase() === ".md";
    const scope = options.scope || "all";
    if (!["all", "specifications", "system-definition"].includes(scope)) {
      throw new Error("--scope must be all, specifications or system-definition");
    }
    if (single && scope !== "system-definition" && options.selection.specifications?.length !== 1) {
      throw new Error("A .md output file requires exactly one --spec, or --scope system-definition. Use a directory for all specifications.");
    }
    // Never replace the current workspace or one of its ancestors as an export directory.
    if (!single && (outputPath === process.cwd() || process.cwd().startsWith(outputPath + sep) || outputPath === dirname(outputPath))) {
      throw new Error("Choose a dedicated export directory, not the working directory or one of its parents.");
    }
    const companionName = single ? basename(outputPath).slice(0, -3) + ".files" : undefined;
    const targets = single ? [outputPath, join(dirname(outputPath), companionName!)] : [outputPath];
    await mkdir(dirname(outputPath), { recursive: true });
    // Cooperating CLI processes must not publish into the same destination simultaneously.
    const lockPath = outputPath + ".ellygent-export-lock";
    try {
      await mkdir(lockPath);
    } catch (error) {
      throw new Error(`Cannot lock export destination ${outputPath}. Another export may be running, or the directory is not writable.`, { cause: error });
    }
    let staging: string | undefined;
    let preserveStaging = false;
    try {
      for (const [index, target] of targets.entries()) {
        const stat = await statIfExists(target);
        if (stat?.isSymbolicLink()) throw new Error(`Refusing symbolic-link output: ${target}`);
        if (stat && !options.overwrite) throw new Error(`Output already exists: ${target}. Use --overwrite to replace this export.`);
        if (stat && (single && index === 0 ? !stat.isFile() : !stat.isDirectory())) {
          throw new Error(`Output has the wrong file/directory type: ${target}`);
        }
      }
      staging = await mkdtemp(join(dirname(outputPath), ".ellygent-markdown-"));
      const zipPath = join(staging, "export.zip");
      await this.client.downloadContextPackage({
        project_identifier: options.project,
        version_identifier: options.version,
        selection: options.selection,
        format: "markdown",
        markdown_scope: scope,
        ...(single ? { markdown_filename: basename(outputPath) } : {}),
      }, zipPath);
      const names = new Set<string>();
      for (const entry of new AdmZip(zipPath).getEntries()) {
        const key = entry.entryName.replace(/\\/g, "/").toLowerCase();
        if (names.has(key)) throw new Error(`Duplicate path in Markdown package: ${entry.entryName}`);
        names.add(key);
      }
      const workspace = join(staging, "workspace");
      await mkdir(workspace);
      const { manifest, targetDir } = await new PackageExtractor().extract(zipPath, workspace, staging);
      if (manifest.export_format !== "markdown") {
        throw new Error("Backend did not return a Markdown export. Update the backend to a version supporting Markdown delivery packages.");
      }
      if (single && (manifest.primary_file !== basename(outputPath) || manifest.companion_directory !== companionName)) {
        throw new Error("Markdown package does not match the requested output filename.");
      }
      const reportRoot = single ? join(targetDir, companionName!) : targetDir;
      const report: MarkdownExportReport = JSON.parse(await readFile(join(reportRoot, "export-report.json"), "utf8"));
      if (!["complete", "partial"].includes(report.status) || !Array.isArray(report.unavailable_assets) || !Array.isArray(report.limitations)) {
        throw new Error("Markdown package has an invalid export report.");
      }
      const sources = single ? [join(targetDir, basename(outputPath)), reportRoot] : [targetDir];
      const backups: Array<{ target: string; backup: string }> = [];
      const published: string[] = [];
      try {
        for (const [index, target] of targets.entries()) {
          if (await statIfExists(target)) {
            if (!options.overwrite) throw new Error(`Output appeared during export: ${target}. No files replaced.`);
            const backup = join(staging, `backup-${index}`);
            await rename(target, backup);
            backups.push({ target, backup });
          }
          await rename(sources[index], target);
          published.push(target);
        }
      } catch (error) {
        const recoveryErrors: string[] = [];
        for (const target of published.reverse()) {
          try { await rm(target, { recursive: true, force: true }); } catch { recoveryErrors.push(target); }
        }
        for (const { target, backup } of backups.reverse()) {
          try { await rename(backup, target); } catch { recoveryErrors.push(target); }
        }
        if (recoveryErrors.length) {
          preserveStaging = true;
          throw new Error(`Partial export failed and rollback was incomplete. Recover original files from ${staging}. Affected paths: ${recoveryErrors.join(", ")}`, { cause: error });
        }
        throw new Error("Markdown export could not be published; previous outputs were restored.", { cause: error });
      }
      return { outputPath, manifest, report };
    } finally {
      try {
        if (staging && !preserveStaging) await rm(staging, { recursive: true, force: true });
      } finally {
        await rm(lockPath, { recursive: true, force: true });
      }
    }
  }
}

async function statIfExists(path: string) {
  try { return await lstat(path); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
