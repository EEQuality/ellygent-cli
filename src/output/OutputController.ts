import { Logger, LogLevel } from "./logger.js";
import { FormatterContext, OutputFormat, outputSuccess, outputError, outputInfo, outputData, outputTable } from "../utils/formatter.js";
import ora, { Ora } from "ora";

export enum OutputMode {
  DEFAULT = "default",
  JSON = "json",
  QUIET = "quiet",
  VERBOSE = "verbose",
  DEBUG = "debug"
}

export interface OutputControllerOptions {
  mode: OutputMode;
  format?: OutputFormat;
  noColor?: boolean;
}

/**
 * Central output controller for all CLI output
 * Handles different output modes: default, json, quiet, verbose, debug
 */
export class OutputController {
  private mode: OutputMode;
  private format: OutputFormat;
  private logger: Logger;
  private spinner: Ora | null = null;
  private jsonOutput: Record<string, unknown> = {};

  constructor(options: OutputControllerOptions) {
    this.mode = options.mode;
    this.format = options.format ?? (this.mode === OutputMode.JSON ? "json" : "markdown");
    
    // Determine log level based on mode
    let logLevel: LogLevel;
    switch (this.mode) {
      case OutputMode.DEBUG:
        logLevel = LogLevel.DEBUG;
        break;
      case OutputMode.VERBOSE:
        logLevel = LogLevel.INFO;
        break;
      case OutputMode.QUIET:
        logLevel = LogLevel.ERROR;
        break;
      default:
        logLevel = LogLevel.WARN;
    }
    
    this.logger = new Logger({
      level: logLevel,
      enableFileLogging: this.mode === OutputMode.DEBUG,
      quiet: this.mode === OutputMode.QUIET
    });

    // Disable colors if NO_COLOR env var is set
    if (options.noColor || process.env.NO_COLOR) {
      process.env.FORCE_COLOR = "0";
    }
  }

  /**
   * Get formatter context for backward compatibility
   */
  getFormatterContext(): FormatterContext {
    return { format: this.format };
  }

  /**
   * Check if we're in quiet mode
   */
  isQuiet(): boolean {
    return this.mode === OutputMode.QUIET;
  }

  /**
   * Check if we're in JSON mode
   */
  isJson(): boolean {
    return this.mode === OutputMode.JSON;
  }

  /**
   * Check if we're in verbose mode or higher
   */
  isVerbose(): boolean {
    return this.mode === OutputMode.VERBOSE || this.mode === OutputMode.DEBUG;
  }

  /**
   * Check if we're in debug mode
   */
  isDebug(): boolean {
    return this.mode === OutputMode.DEBUG;
  }

  /**
   * Output success message
   */
  success(message: string): void {
    if (this.isJson()) {
      this.jsonOutput.success = true;
      this.jsonOutput.message = message;
    } else if (!this.isQuiet()) {
      this.logger.success(message);
    }
  }

  /**
   * Output error message
   */
  error(message: string, details?: unknown): void {
    if (this.isJson()) {
      this.jsonOutput.error = message;
      if (details) this.jsonOutput.details = details;
      this.flush();
    } else {
      this.logger.error(message, details);
    }
  }

  /**
   * Output info message
   */
  info(message: string): void {
    if (this.isJson()) {
      // In JSON mode, accumulate info messages
      if (!this.jsonOutput.info) this.jsonOutput.info = [];
      (this.jsonOutput.info as string[]).push(message);
    } else if (!this.isQuiet()) {
      this.logger.info(message);
    }
  }

  /**
   * Output warning message
   */
  warn(message: string): void {
    if (this.isJson()) {
      if (!this.jsonOutput.warnings) this.jsonOutput.warnings = [];
      (this.jsonOutput.warnings as string[]).push(message);
    } else {
      this.logger.warn(message);
    }
  }

  /**
   * Output debug message
   */
  debug(message: string, data?: unknown): void {
    this.logger.debug(message, data);
  }

  /**
   * Output verbose message (only in verbose/debug mode)
   */
  verbose(message: string): void {
    if (this.isVerbose()) {
      this.logger.info(message);
    }
  }

  /**
   * Output data (JSON or formatted)
   */
  data(data: unknown): void {
    if (this.isJson()) {
      Object.assign(this.jsonOutput, data);
    } else if (!this.isQuiet()) {
      outputData(data, this.getFormatterContext());
    }
  }

  /**
   * Output table data
   */
  table<T extends Record<string, unknown>>(
    rows: T[],
    columns: Array<keyof T & string>
  ): void {
    if (this.isJson()) {
      this.jsonOutput.data = rows;
      this.jsonOutput.count = rows.length;
    } else if (!this.isQuiet()) {
      outputTable(rows, columns as string[], this.getFormatterContext());
    }
  }

  /**
   * Start a spinner (disabled in JSON/quiet/debug modes)
   */
  startSpinner(message: string): void {
    if (this.isJson() || this.isQuiet() || this.isDebug()) {
      // In debug mode, just log the message
      if (this.isDebug()) {
        this.debug(`→ ${message}`);
      }
      return;
    }

    this.spinner = ora(message).start();
  }

  /**
   * Update spinner text
   */
  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    } else if (this.isDebug()) {
      this.debug(`→ ${message}`);
    }
  }

  /**
   * Stop spinner with success
   */
  succeedSpinner(message?: string): void {
    if (this.spinner) {
      if (message) {
        this.spinner.succeed(message);
      } else {
        this.spinner.succeed();
      }
      this.spinner = null;
    } else if (message && this.isDebug()) {
      this.debug(`✓ ${message}`);
    }
  }

  /**
   * Stop spinner with failure
   */
  failSpinner(message?: string): void {
    if (this.spinner) {
      if (message) {
        this.spinner.fail(message);
      } else {
        this.spinner.fail();
      }
      this.spinner = null;
    } else if (message && this.isDebug()) {
      this.debug(`✗ ${message}`);
    }
  }

  /**
   * Stop spinner without status
   */
  stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Log HTTP request (debug mode only)
   */
  logRequest(method: string, url: string, body?: unknown): void {
    this.logger.logRequest(method, url, body);
  }

  /**
   * Log HTTP response (debug mode only)
   */
  logResponse(status: number, url: string, responseTime?: number, size?: number): void {
    this.logger.logResponse(status, url, responseTime, size);
  }

  /**
   * Flush JSON output to stdout
   */
  flush(): void {
    if (this.isJson() && Object.keys(this.jsonOutput).length > 0) {
      console.log(JSON.stringify(this.jsonOutput, null, 2));
      this.jsonOutput = {};
    }
  }

  /**
   * Complete output (flush JSON if needed)
   */
  complete(): void {
    this.stopSpinner();
    this.flush();
  }
}
