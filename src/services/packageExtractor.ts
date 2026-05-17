import AdmZip from "adm-zip";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { PackageManifest } from "../types/context.js";
import { contextDirectory } from "../utils/workspace.js";

export interface ExtractResult {
  manifest: PackageManifest;
  targetDir: string;
}

export class PackageExtractor {
  async extract(zipPath: string, workspace: string, stagingRoot: string): Promise<ExtractResult> {
    const extractionRoot = resolve(stagingRoot, "extract");
    await mkdir(extractionRoot, { recursive: true });

    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    if (entries.length === 0) {
      throw new Error("Downloaded ZIP package is empty.");
    }

    for (const entry of entries) {
      const safeName = normalizeZipEntry(entry.entryName);
      if (!safeName.startsWith(".ellygent/") && safeName !== ".ellygent") {
        throw new Error(`Unexpected ZIP entry outside .ellygent/: ${entry.entryName}`);
      }

      const targetPath = resolve(extractionRoot, safeName);
      assertInside(targetPath, extractionRoot);

      if (entry.isDirectory) {
        await mkdir(targetPath, { recursive: true });
        continue;
      }

      await mkdir(dirname(targetPath), { recursive: true });
      const data = entry.getData();
      await writeFile(targetPath, data);
    }

    const stagedContextDir = resolve(extractionRoot, ".ellygent");
    const stagedManifestPath = resolve(stagedContextDir, "manifest.json");
    const manifest = await readManifest(stagedManifestPath);

    const targetDir = contextDirectory(workspace);
    await rm(targetDir, { recursive: true, force: true });
    await rename(stagedContextDir, targetDir);

    return { manifest, targetDir };
  }
}

async function readManifest(path: string): Promise<PackageManifest> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw new Error("Extracted package does not contain a valid .ellygent/manifest.json.");
  }

  if (!isManifest(parsed)) {
    throw new Error("Extracted package manifest is missing required fields.");
  }

  return parsed;
}

function normalizeZipEntry(entryName: string): string {
  const normalized = entryName.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0")) {
    throw new Error("ZIP package contains an invalid entry name.");
  }
  if (normalized.includes("../") || normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`Unsafe ZIP entry path: ${entryName}`);
  }
  if (/^[A-Za-z]:/.test(normalized)) {
    throw new Error(`Unsafe absolute ZIP entry path: ${entryName}`);
  }
  return normalized;
}

function assertInside(candidate: string, root: string): void {
  const normalizedRoot = resolve(root);
  const normalizedCandidate = resolve(candidate);
  if (normalizedCandidate !== normalizedRoot && !normalizedCandidate.startsWith(`${normalizedRoot}${sep}`)) {
    throw new Error("ZIP package attempted to write outside the extraction directory.");
  }
}

function isManifest(value: unknown): value is PackageManifest {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Partial<PackageManifest>;
  return (
    typeof item.schema_version === "string" &&
    typeof item.generated_at === "string" &&
    typeof item.project?.identifier === "string" &&
    typeof item.project?.name === "string" &&
    typeof item.version?.identifier === "string" &&
    typeof item.version?.type === "string" &&
    typeof item.contents === "object" &&
    item.contents !== null
  );
}
