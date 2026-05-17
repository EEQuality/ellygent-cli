#!/usr/bin/env node
import { Command } from "commander";
import { registerConfigCommand } from "./commands/config.js";
import { registerDiscoveryCommands } from "./commands/discovery.js";
import { registerLoginCommand } from "./commands/login.js";
import { createCommandContext } from "./commands/shared.js";
import { registerSyncCommand } from "./commands/sync.js";

const program = new Command();
const context = createCommandContext();

program
  .name("ellygent")
  .description("Ellygent CLI for engineering context discovery and sync")
  .version("0.1.0");

registerLoginCommand(program, context);
registerDiscoveryCommands(program, context);
registerSyncCommand(program, context);
registerConfigCommand(program, context);

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected CLI error";
  console.error(`error ${message}`);
  process.exitCode = 1;
});
