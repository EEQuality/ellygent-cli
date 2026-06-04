import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { registerLoginCommand } from "./login.js";

describe("root login command", () => {
  it("exposes token-only login options", () => {
    const program = new Command();
    registerLoginCommand(program, {
      configStore: {} as never,
      clientFactory: {} as never,
    });

    const login = program.commands.find((command) => command.name() === "login");
    expect(login).toBeDefined();
    expect(login?.options.map((option) => option.long)).toContain("--token");
    expect(login?.options.map((option) => option.long)).not.toContain("--email");
    expect(login?.options.map((option) => option.long)).not.toContain("--pat");
  });
});
