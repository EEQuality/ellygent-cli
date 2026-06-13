import { Command } from "commander";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { registerPullCommand } from "./pull.js";
import type { CommandContext } from "../shared.js";

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
    const help = pull?.helpInformation() || "";

    expect(help).toContain("reqif");
    expect(help).toContain("reqifz");
    expect(help).toContain("ReqIF and ReqIFZ exports require a specific project version");
    expect(help).toContain("Exporting from MAIN or live state is not allowed for ReqIF formats");
  });

  it("shows ReqIF export examples in help text", () => {
    const pull = command.commands.find((cmd) => cmd.name() === "pull");
    const help = pull?.helpInformation() || "";

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
    const help = pull?.helpInformation() || "";

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
    const help = pull?.helpInformation() || "";

    expect(help).toContain("Create a version first");
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
    const help = pull?.helpInformation() || "";

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
    const help = pull?.helpInformation() || "";

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
    const help = pull?.helpInformation() || "";

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
    const help = pull?.helpInformation() || "";

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
    const help = pull?.helpInformation() || "";

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
    const help = pull?.helpInformation() || "";

    expect(help).toContain("reqifz");
  });
});
