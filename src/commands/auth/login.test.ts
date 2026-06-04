import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { registerLoginCommand } from "./login.js";

describe("auth login command", () => {
  it("documents token-only authentication and excludes password prompts", () => {
    const auth = new Command();
    registerLoginCommand(auth, {
      configStore: {} as never,
      clientFactory: {} as never,
    });

    const login = auth.commands.find((command) => command.name() === "login");
    expect(login).toBeDefined();

    const help = login?.helpInformation() || "";
    expect(help).toContain("--token");
    expect(help).not.toContain("password");
    expect(help).not.toContain("email/password");
    expect(help).not.toContain("ELLYGENT_PASSWORD");
  });
});
