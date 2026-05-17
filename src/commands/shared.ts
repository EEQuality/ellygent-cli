import ora from "ora";
import { ConfigStore } from "../config/configStore.js";
import { ClientFactory } from "../services/clientFactory.js";
import { printError } from "../utils/terminal.js";
import { userMessageForApiError } from "../api/errors.js";

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

export function withErrorHandling<T extends unknown[]>(
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
  throw new Error(`Missing ${optionName}${suffix}.`);
}
