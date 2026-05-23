import ora from "ora";
import { ConfigStore } from "../config/configStore.js";
import { ClientFactory } from "../services/clientFactory.js";
import { printError } from "../utils/terminal.js";
import { userMessageForApiError } from "../api/errors.js";
import { createFormatter, type FormatterContext, type OutputFormat } from "../utils/formatter.js";
import { OutputController, OutputMode } from "../output/OutputController.js";
import { presentError } from "../errors/ErrorPresenter.js";
import { ValidationError } from "../errors/EllygentError.js";
import type { Command } from "commander";

export interface CommandContext {
  configStore: ConfigStore;
  clientFactory: ClientFactory;
}

export function createCommandContext(): CommandContext {
  const configStore = new ConfigStore();
  return {
    configStore,
    clientFactory: new ClientFactory(configStore)
  };
}

export function getFormatter(command: Command): FormatterContext {
  const opts = command.optsWithGlobals() as { format?: string };
  const format = (opts.format || "json") as OutputFormat;
  return createFormatter(format);
}

/**
 * Get OutputController from command options
 */
export function getOutputController(command: Command): OutputController {
  const opts = command.optsWithGlobals() as { 
    format?: string; 
    quiet?: boolean;
    verbose?: boolean;
    debug?: boolean;
    json?: boolean;
  };
  
  // Determine output mode
  let mode: OutputMode;
  if (opts.debug) {
    mode = OutputMode.DEBUG;
  } else if (opts.verbose) {
    mode = OutputMode.VERBOSE;
  } else if (opts.quiet) {
    mode = OutputMode.QUIET;
  } else if (opts.json || opts.format === "json") {
    mode = OutputMode.JSON;
  } else {
    mode = OutputMode.DEFAULT;
  }
  
  return new OutputController({
    mode,
    format: (opts.format || "json") as OutputFormat
  });
}

/**
 * Enhanced error handling wrapper with proper error presentation
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<void>
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    // Get the command from the last argument
    const command = args[args.length - 1] as Command;
    const output = getOutputController(command);
    
    try {
      await handler(...args);
    } catch (error) {
      presentError(error, output);
    }
  };
}

/**
 * Legacy error handling for commands not yet migrated
 */
export function withLegacyErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<void>
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    try {
      await handler(...args);
    } catch (error) {
      printError(userMessageForApiError(error));
      process.exitCode = 1;
    }
  };
}

export async function spin<T>(message: string, task: () => Promise<T>): Promise<T> {
  const spinner = ora(message).start();
  try {
    const result = await task();
    spinner.stop();
    return result;
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

export function requireOption(value: string | undefined, optionName: string, configHint?: string): string {
  if (value && value.trim()) {
    return value.trim();
  }
  
  const suffix = configHint ? ` or set ${configHint}` : "";
  const suggestions = configHint 
    ? [`Use --help to see all options`, `Set ${configHint} for default value`]
    : [`Use --help to see all options`];
    
  throw new ValidationError(`Missing ${optionName}${suffix}`, {
    suggestions,
    details: { optionName, configHint }
  });
}
