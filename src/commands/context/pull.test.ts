import { Command } from "commander";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SyncService } from "../../services/syncService.js";
import { MarkdownExportService } from "../../services/markdownExportService.js";
import { registerPullCommand } from "./pull.js";
import type { CommandContext } from "../shared.js";

// Commander appends addHelpText only when rendering help, not in helpInformation().
function renderedHelp(command: Command | undefined): string {
  if (!command) throw new Error("Pull command was not registered");
  let help = "";
  command.configureOutput({ writeOut: (text) => { help += text; } });
  command.outputHelp();
  return help;
}

describe("context pull command", () => {
  let command: Command;
  let mockContext: CommandContext;
  let mockClient: {
    downloadReqIFExport: ReturnType<typeof vi.fn>;
    downloadContextPackage: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockClient = {
      downloadReqIFExport: vi.fn(),
      downloadContextPackage: vi.fn(),
    };

    mockContext = {
      configStore: {
        load: vi.fn().mockResolvedValue({ defaultProject: undefined }),
      } as never,
      clientFactory: {
        contextClient: vi.fn().mockResolvedValue(mockClient),
      } as never,
    };

    command = new Command();
    registerPullCommand(command, mockContext);
  });

  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  it("uses Markdown export with the actual root-level --format option present", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const markdown = vi.spyOn(MarkdownExportService.prototype, "export").mockResolvedValue({
      outputPath: "./sandbox.md", report: { status: "complete", limitations: [] },
      manifest: { version: { identifier: "main", type: "live" } },
    } as never);
    const root = new Command().option("-f, --format <type>", "Output format", "json").option("--json");
    registerPullCommand(root.command("context"), mockContext);
    await root.parseAsync(["context", "pull", "--project", "sandbox-a", "--format", "markdown", "--out", "./sandbox.md", "--include-traceability", "--json"], { from: "user" });
    expect(markdown).toHaveBeenCalledWith(expect.objectContaining({ project: "sandbox-a", out: "./sandbox.md", selection: expect.objectContaining({ include_traceability: true }) }));
    expect(mockClient.downloadContextPackage).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });

  it("uses ReqIF export with the actual root-level --format option present", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const root = new Command().option("-f, --format <type>", "Output format", "json");
    registerPullCommand(root.command("context"), mockContext);
    await root.parseAsync(["context", "pull", "--project", "tractor", "--version", "baseline-1", "--format", "reqif", "--out", "./tractor.reqif"], { from: "user" });
    expect(mockClient.downloadReqIFExport).toHaveBeenCalledWith("tractor", "reqif", "baseline-1", "./tractor.reqif");
    expect(mockClient.downloadContextPackage).not.toHaveBeenCalled();
  });

  it("preserves global JSON output while using the default context export", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const sync = vi.spyOn(SyncService.prototype, "sync").mockResolvedValue({
      targetDir: "./context", manifest: { project: { name: "Sandbox", identifier: "sandbox-a" }, version: { identifier: "main" }, generated_at: "2030-01-01" },
    } as never);
    const root = new Command().option("-f, --format <type>", "Output format", "json");
    registerPullCommand(root.command("context"), mockContext);
    await root.parseAsync(["context", "pull", "--project", "sandbox-a", "--format", "json"], { from: "user" });
    expect(sync).toHaveBeenCalledWith(expect.objectContaining({ project: "sandbox-a" }));
    expect(process.exitCode).toBeUndefined();
  });

  it.each(["reqif", "reqifz"])("downloads a saved baseline as %s", async (format) => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    await command.parseAsync([
      "pull", "--project", "tractor", "--version", "baseline-1",
      "--format", format, "--out", `./tractor.${format}`,
    ], { from: "user" });

    expect(mockClient.downloadReqIFExport).toHaveBeenCalledWith(
      "tractor", format, "baseline-1", `./tractor.${format}`,
    );
    expect(mockClient.downloadContextPackage).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });

  it.each([
    ["reqif", []],
    ["reqifz", ["--version", "MAIN"]],
  ])("rejects live %s export before creating an API client", async (format, versionArgs) => {
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    await command.parseAsync([
      "pull", "--project", "tractor", "--format", format,
      "--out", `./tractor.${format}`, ...versionArgs,
    ], { from: "user" });

    expect(process.exitCode).toBe(1);
    expect(stderr.mock.calls.flat().join(" ")).toContain("ReqIF export requires a specific project version");
    expect(mockContext.clientFactory.contextClient).not.toHaveBeenCalled();
    expect(mockClient.downloadReqIFExport).not.toHaveBeenCalled();
  });

  it("registers pull command with required options", () => {
    const pull = command.commands.find((cmd) => cmd.name() === "pull");
    expect(pull).toBeDefined();

    const options = pull?.options || [];
    const optionNames = options.map((opt) => opt.long);

    expect(optionNames).toContain("--project");
    expect(optionNames).toContain("--version");
    expect(optionNames).toContain("--format");
    expect(optionNames).toContain("--out");
  });

  it("documents ReqIF version requirement in help text", () => {
    const pull = command.commands.find((cmd) => cmd.name() === "pull");
    const help = renderedHelp(pull);

    expect(help).toContain("reqif");
    expect(help).toContain("reqifz");
    expect(help).toContain("ReqIF and ReqIFZ exports require a specific project version");
    expect(help).toContain("Exporting from MAIN or live state is not allowed for ReqIF formats");
  });

  it("shows ReqIF export examples in help text", () => {
    const pull = command.commands.find((cmd) => cmd.name() === "pull");
    const help = renderedHelp(pull);

    expect(help).toContain("--format reqif");
    expect(help).toContain("--format reqifz");
    expect(help).toContain("--version baseline-1.0.0");
    expect(help).toContain(".reqif");
    expect(help).toContain(".reqifz");
  });

  it("accepts valid format options", () => {
    const pull = command.commands.find((cmd) => cmd.name() === "pull");
    const formatOption = pull?.options.find((opt) => opt.long === "--format");

    expect(formatOption).toBeDefined();
    expect(formatOption?.description).toContain("context");
    expect(formatOption?.description).toContain("markdown");
    expect(formatOption?.description).toContain("reqif");
    expect(formatOption?.description).toContain("reqifz");
  });

  it("documents that --out is required for ReqIF exports", () => {
    const pull = command.commands.find((cmd) => cmd.name() === "pull");
    const help = renderedHelp(pull);

    // Examples should show --out with ReqIF formats
    const reqifExampleMatch = help.match(/--format reqif.*--out/s);
    expect(reqifExampleMatch).toBeTruthy();

    const reqifzExampleMatch = help.match(/--format reqifz.*--out/s);
    expect(reqifzExampleMatch).toBeTruthy();
  });

  it("defaults format to context when not specified", () => {
    const pull = command.commands.find((cmd) => cmd.name() === "pull");
    const formatOption = pull?.options.find((opt) => opt.long === "--format");

    expect(formatOption?.defaultValue).toBe("context");
  });

  it("defaults version to main when not specified", () => {
    const pull = command.commands.find((cmd) => cmd.name() === "pull");
    const versionOption = pull?.options.find((opt) => opt.long === "--version");

    expect(versionOption?.defaultValue).toBe("main");
  });

  it("shows warning about creating versions first", () => {
    const pull = command.commands.find((cmd) => cmd.name() === "pull");
    const help = renderedHelp(pull);

    expect(help).toContain("Create a version in the web app");
  });
});

describe("context pull command - ReqIF format validation", () => {
  it("documents that ReqIF export is blocked from MAIN", () => {
    const command = new Command();
    const mockContext = {
      configStore: {
        load: vi.fn().mockResolvedValue({ defaultProject: undefined }),
      } as never,
      clientFactory: {
        contextClient: vi.fn(),
      } as never,
    };

    registerPullCommand(command, mockContext);

    const pull = command.commands.find((cmd) => cmd.name() === "pull");
    const help = renderedHelp(pull);

    // Should document the restriction
    expect(help).toContain("not allowed for ReqIF formats");
    expect(help).toContain("MAIN");
  });

  it("shows error message format in help", () => {
    const command = new Command();
    const mockContext = {
      configStore: {
        load: vi.fn().mockResolvedValue({ defaultProject: undefined }),
      } as never,
      clientFactory: {
        contextClient: vi.fn(),
      } as never,
    };

    registerPullCommand(command, mockContext);

    const pull = command.commands.find((cmd) => cmd.name() === "pull");
    const help = renderedHelp(pull);

    // Help should guide users on the correct usage
    expect(help.toLowerCase()).toContain("version");
    expect(help.toLowerCase()).toContain("specific");
  });
});

describe("context pull command - format option", () => {
  it("supports context format", () => {
    const command = new Command();
    const mockContext = {
      configStore: {
        load: vi.fn().mockResolvedValue({ defaultProject: undefined }),
      } as never,
      clientFactory: {
        contextClient: vi.fn(),
      } as never,
    };

    registerPullCommand(command, mockContext);

    const pull = command.commands.find((cmd) => cmd.name() === "pull");
    const help = renderedHelp(pull);

    expect(help).toContain("context");
  });

  it("supports markdown format", () => {
    const command = new Command();
    const mockContext = {
      configStore: {
        load: vi.fn().mockResolvedValue({ defaultProject: undefined }),
      } as never,
      clientFactory: {
        contextClient: vi.fn(),
      } as never,
    };

    registerPullCommand(command, mockContext);

    const pull = command.commands.find((cmd) => cmd.name() === "pull");
    const help = renderedHelp(pull);

    expect(help).toContain("markdown");
  });

  it("supports reqif format", () => {
    const command = new Command();
    const mockContext = {
      configStore: {
        load: vi.fn().mockResolvedValue({ defaultProject: undefined }),
      } as never,
      clientFactory: {
        contextClient: vi.fn(),
      } as never,
    };

    registerPullCommand(command, mockContext);

    const pull = command.commands.find((cmd) => cmd.name() === "pull");
    const help = renderedHelp(pull);

    expect(help).toContain("reqif");
  });

  it("supports reqifz format", () => {
    const command = new Command();
    const mockContext = {
      configStore: {
        load: vi.fn().mockResolvedValue({ defaultProject: undefined }),
      } as never,
      clientFactory: {
        contextClient: vi.fn(),
      } as never,
    };

    registerPullCommand(command, mockContext);

    const pull = command.commands.find((cmd) => cmd.name() === "pull");
    const help = renderedHelp(pull);

    expect(help).toContain("reqifz");
  });
});
