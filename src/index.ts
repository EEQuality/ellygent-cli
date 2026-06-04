#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { createCommandContext } from "./commands/shared.js";
import { registerAuthCommands } from "./commands/auth/index.js";
import { registerContextCommands } from "./commands/context/index.js";
import { registerConfigCommands } from "./commands/config/index.js";
import { registerCompletionCommands } from "./commands/completion.js";
import { registerWhoAmICommand } from "./commands/whoami.js";
import { formatCommandCategories } from "./utils/help.js";

// Legacy command imports for backward compatibility
import { registerLoginCommand as registerLegacyLogin } from "./commands/login.js";
import { registerDiscoveryCommands as registerLegacyDiscovery } from "./commands/discovery.js";
import { registerSyncCommand as registerLegacySync } from "./commands/sync.js";
import { registerConfigCommand as registerLegacyConfig } from "./commands/config.js";

const program = new Command();

program
  .name("ellygent")
  .description("Professional CLI for engineering context discovery, requirements sync, and AI-assisted workflows")
  .version("0.1.1")
  .option("-f, --format <type>", "Output format: json (default) or markdown/md", "json")
  .option("--json", "Output as JSON (shorthand for --format json)")
  .option("-q, --quiet", "Suppress all output except errors")
  .option("-v, --verbose", "Show detailed progress and information")
  .option("--debug", "Show debug output and enable file logging")
  .addHelpText('after', `
${chalk.bold("COMMANDS")}

${chalk.bold("Authentication")}
  ${chalk.dim("Authenticate with Ellygent and manage credentials")}

  ${chalk.cyan("auth login")}       Authenticate with a Personal Access Token
  ${chalk.cyan("auth logout")}      Clear stored credentials
  ${chalk.cyan("auth status")}      Show current authentication status
  ${chalk.cyan("whoami")}           Show current authentication status

${chalk.bold("Context & Sync")}
  ${chalk.dim("Discover and download engineering context packages")}

  ${chalk.cyan("context orgs")}     List organizations
  ${chalk.cyan("context projects")} List projects in an organization
  ${chalk.cyan("context versions")} List versions (live and baselines)
  ${chalk.cyan("context inspect")}  Inspect exportable engineering context
  ${chalk.cyan("context pull")}     Download context package to local workspace

${chalk.bold("Configuration")}
  ${chalk.dim("Manage CLI configuration and preferences")}

  ${chalk.cyan("config get")}       Get a configuration value
  ${chalk.cyan("config set")}       Set a configuration value
  ${chalk.cyan("config list")}      List all configuration values
  ${chalk.cyan("config reset")}     Reset configuration to defaults

${chalk.bold("Shell Completion")}
  ${chalk.dim("Enable tab completion for faster command entry")}

  ${chalk.cyan("completion install")} Install completion for your shell (auto-detects)
  ${chalk.cyan("completion generate")} Generate completion script for a specific shell

${chalk.bold("EXAMPLES")}
  ${chalk.dim("#")} ${chalk.dim("Authenticate with a Personal Access Token")}
  ${chalk.cyan("$")} ellygent login --token elly_pat_xxx

  ${chalk.dim("#")} ${chalk.dim("Check authentication status")}
  ${chalk.cyan("$")} ellygent whoami

  ${chalk.dim("#")} ${chalk.dim("List all accessible organizations")}
  ${chalk.cyan("$")} ellygent context orgs --format markdown

  ${chalk.dim("#")} ${chalk.dim("Download engineering context for a project")}
  ${chalk.cyan("$")} ellygent context pull --project my-project --include-traceability

  ${chalk.dim("#")} ${chalk.dim("Set default organization")}
  ${chalk.cyan("$")} ellygent config set default-org acme-corp

${chalk.bold("LEARN MORE")}
  Documentation: ${chalk.cyan("https://www.ellygent.com/cli")}
  Report issues: ${chalk.cyan("https://github.com/EEQuality/ellygent-cli/issues")}
  Use ${chalk.yellow("--help")} on any command for detailed help
`);

const context = createCommandContext();

// Register new grouped commands
registerAuthCommands(program, context);
registerWhoAmICommand(program, context);
registerContextCommands(program, context);
registerConfigCommands(program, context);
registerCompletionCommands(program);

// Register legacy commands with deprecation warnings for backward compatibility
// These will be removed in v1.0.0
registerLegacyCommandsWithWarnings(program, context);

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected CLI error";
  console.error(`error ${message}`);
  process.exitCode = 1;
});

/**
 * Register legacy flat commands with deprecation warnings
 * Provides smooth migration path for existing users
 */
function registerLegacyCommandsWithWarnings(program: Command, context: typeof createCommandContext extends () => infer R ? R : never): void {
  // Add deprecation warning wrapper
  const warnDeprecated = (oldCmd: string, newCmd: string) => {
    console.warn(chalk.yellow("⚠ Warning:"), `'ellygent ${oldCmd}' is deprecated`);
    console.warn(chalk.yellow("  Use"), `'ellygent ${newCmd}'`, chalk.yellow("instead"));
    console.warn(chalk.yellow("  This command will be removed in v1.0.0"));
    console.warn("");
  };

  // Legacy: ellygent auth login → ellygent auth login
  const legacyLogin = program
    .command("login", { hidden: true })
    .description("[DEPRECATED] Use 'ellygent auth login' instead")
    .option("--api-url <url>", "Ellygent API URL")
    .option("--token <token>", "Personal Access Token")
    .action(async (...args) => {
      warnDeprecated("login", "auth login");
      // Forward to new command by invoking it programmatically
      const authLoginCmd = program.commands.find(c => c.name() === "auth")?.commands.find(c => c.name() === "login");
      if (authLoginCmd) {
        await authLoginCmd.parseAsync(process.argv.slice(2), { from: "user" });
      }
    });

  // Legacy: ellygent orgs → ellygent context orgs
  const legacyOrgs = program
    .command("orgs", { hidden: true })
    .description("[DEPRECATED] Use 'ellygent context orgs' instead")
    .action(async () => {
      warnDeprecated("orgs", "context orgs");
      const contextCmd = program.commands.find(c => c.name() === "context");
      const orgsCmd = contextCmd?.commands.find(c => c.name() === "orgs");
      if (orgsCmd) {
        await orgsCmd.parseAsync([], { from: "user" });
      }
    });

  // Legacy: ellygent projects → ellygent context projects
  const legacyProjects = program
    .command("projects", { hidden: true })
    .description("[DEPRECATED] Use 'ellygent context projects' instead")
    .option("--org <identifier>", "Organization identifier")
    .action(async () => {
      warnDeprecated("projects", "context projects");
      const contextCmd = program.commands.find(c => c.name() === "context");
      const projectsCmd = contextCmd?.commands.find(c => c.name() === "projects");
      if (projectsCmd) {
        await projectsCmd.parseAsync(process.argv.slice(2), { from: "user" });
      }
    });

  // Legacy: ellygent versions → ellygent context versions
  const legacyVersions = program
    .command("versions", { hidden: true })
    .description("[DEPRECATED] Use 'ellygent context versions' instead")
    .option("--project <identifier>", "Project identifier")
    .action(async () => {
      warnDeprecated("versions", "context versions");
      const contextCmd = program.commands.find(c => c.name() === "context");
      const versionsCmd = contextCmd?.commands.find(c => c.name() === "versions");
      if (versionsCmd) {
        await versionsCmd.parseAsync(process.argv.slice(2), { from: "user" });
      }
    });

  // Legacy: ellygent contents → ellygent context inspect
  const legacyContents = program
    .command("contents", { hidden: true })
    .description("[DEPRECATED] Use 'ellygent context inspect' instead")
    .option("--project <identifier>", "Project identifier")
    .option("--version <identifier>", "Version identifier")
    .action(async () => {
      warnDeprecated("contents", "context inspect");
      const contextCmd = program.commands.find(c => c.name() === "context");
      const inspectCmd = contextCmd?.commands.find(c => c.name() === "inspect");
      if (inspectCmd) {
        await inspectCmd.parseAsync(process.argv.slice(2), { from: "user" });
      }
    });

  // Legacy: ellygent sync → ellygent context pull
  const legacySync = program
    .command("sync", { hidden: true })
    .description("[DEPRECATED] Use 'ellygent context pull' instead")
    .option("--project <identifier>", "Project identifier")
    .option("--version <identifier>", "Version identifier")
    .option("--workspace <path>", "Workspace directory")
    .option("--spec <identifier...>", "Specification identifier")
    .option("--system-definition <identifier...>", "System definition identifier")
    .option("--include-traceability", "Include traceability")
    .option("--include-architecture", "Include architecture")
    .option("--include-constraints", "Include constraints")
    .option("--include-glossary", "Include glossary")
    .option("--include-ai-summaries", "Include AI summaries")
    .action(async () => {
      warnDeprecated("sync", "context pull");
      const contextCmd = program.commands.find(c => c.name() === "context");
      const pullCmd = contextCmd?.commands.find(c => c.name() === "pull");
      if (pullCmd) {
        await pullCmd.parseAsync(process.argv.slice(2), { from: "user" });
      }
    });
}
