import AdmZip from "adm-zip";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerPullCommand } from "./pull.js";
import { MarkdownExportService } from "../../services/markdownExportService.js";
import type { CommandContext } from "../shared.js";

// Exercise the command, real sync/extraction, and output together; only the API is replaced.
describe("pull machine-readable result", () => {
  let workspace: string;
  let root: Command;
  let download: ReturnType<typeof vi.fn>;
  let reqifDownload: ReturnType<typeof vi.fn>;
  let stdout: ReturnType<typeof vi.spyOn>;
  const manifest = {
    schema_version: "1.0", project: { identifier: "actual-project", name: "Example" },
    version: { identifier: "release-1", type: "baseline" }, generated_at: "2026-11-08T00:00:00Z",
    contents: { requirements: true, relations: true }, export_layout: "hierarchy_documents",
    hierarchy_count: 1, relation_count: 2,
  };

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), "ellygent-pull-json-"));
    stdout = vi.spyOn(console, "log").mockImplementation(() => {});
    download = vi.fn(async (_request, path: string) => {
      const zip = new AdmZip();
      zip.addFile(".ellygent/manifest.json", Buffer.from(JSON.stringify(manifest)));
      zip.addFile(".ellygent/project-summary.md", Buffer.from("# Example"));
      zip.writeZip(path);
    });
    reqifDownload = vi.fn().mockResolvedValue(undefined);
    const context = {
      configStore: { load: vi.fn().mockResolvedValue({ defaultProject: "configured-project" }) },
      clientFactory: { contextClient: vi.fn().mockResolvedValue({ downloadContextPackage: download, downloadReqIFExport: reqifDownload }) },
    } as unknown as CommandContext;
    root = new Command().option("-f, --format <type>", "Output format", "json").option("--json");
    registerPullCommand(root.command("context"), context);
  });

  afterEach(async () => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
    await rm(workspace, { recursive: true, force: true });
  });

  function result() {
    // Parse ALL stdout: multiple independently valid JSON objects must fail this assertion.
    return JSON.parse(stdout.mock.calls.map(args => args.join(" ")).join("\n"));
  }

  it.each([[], ["--json"], ["--format", "json"], ["--format", "context", "--json"]].map(flags => ({ flags })))(
    "returns one JSON value with returned baseline provenance ($flags)", async ({ flags }) => {
      await root.parseAsync(["context", "pull", "--version", "release-alias", "--workspace", workspace, ...flags], { from: "user" });
      expect(result()).toEqual({ status: "success", export_format: "context", output_path: join(workspace, ".ellygent"),
        project: manifest.project, version: manifest.version, manifest });
      expect(download).toHaveBeenCalledWith(expect.objectContaining({
        project_identifier: "configured-project", version_identifier: "release-alias", format: "zip",
      }), expect.any(String));
      expect(await readFile(join(workspace, ".ellygent", "manifest.json"), "utf8")).toBe(JSON.stringify(manifest));
      expect(process.exitCode).toBeUndefined();
    }
  );

  it("preserves human-readable output when JSON is not selected", async () => {
    await root.parseAsync(["context", "pull", "--format", "context", "--workspace", workspace], { from: "user" });
    expect(stdout.mock.calls.flat().join(" ")).toContain("Context pulled to");
    expect(stdout.mock.calls.flat().join(" ")).toContain("release-1");
    expect(() => result()).toThrow();
  });

  it("keeps failure output and exit code without a success result", async () => {
    download.mockRejectedValue(new Error("Context service unavailable"));
    await root.parseAsync(["context", "pull", "--json", "--workspace", workspace], { from: "user" });
    expect(result()).toMatchObject({ message: "Context service unavailable" });
    expect(result().status).not.toBe("success");
    expect(process.exitCode).toBe(1);
  });

  it.each(["reqif", "reqifz"])("returns one %s result without inventing manifest provenance", async (format) => {
    const out = join(workspace, `project.${format}`);
    await root.parseAsync(["context", "pull", "--project", "example", "--version", "release-1",
      "--format", format, "--json", "--out", out], { from: "user" });
    expect(result()).toEqual({ status: "success", export_format: format, output_path: out,
      requested_project_identifier: "example", requested_version_identifier: "release-1" });
    expect(reqifDownload).toHaveBeenCalledWith("example", format, "release-1", out);
    expect(download).not.toHaveBeenCalled();
  });

  it.each(["complete", "partial"])("returns one Markdown result with %s report and matching exit code", async (status) => {
    const report = { status, limitations: ["Project files are not versioned"], unavailable_assets: [] };
    vi.spyOn(MarkdownExportService.prototype, "export").mockResolvedValue({
      outputPath: join(workspace, "docs"), manifest, report,
    } as never);
    await root.parseAsync(["context", "pull", "--format", "markdown", "--json", "--out", join(workspace, "docs")], { from: "user" });
    expect(result()).toEqual({ status: status === "partial" ? "partial" : "success", export_format: "markdown",
      output_path: join(workspace, "docs"), project: manifest.project, version: manifest.version, manifest, report });
    expect(process.exitCode).toBe(status === "partial" ? 2 : undefined);
  });
});
