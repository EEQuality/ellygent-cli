import chalk from "chalk";
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LoggerOptions {
  level: LogLevel;
  enableFileLogging?: boolean;
  logFilePath?: string;
  quiet?: boolean;
}

export class Logger {
  private level: LogLevel;
  private enableFileLogging: boolean;
  private logFilePath: string;
  private quiet: boolean;

  constructor(options: LoggerOptions) {
    this.level = options.level;
    this.enableFileLogging = options.enableFileLogging ?? false;
    this.quiet = options.quiet ?? false;
    
    // Default log file location: ~/.ellygent/debug.log
    this.logFilePath = options.logFilePath ?? join(homedir(), ".ellygent", "debug.log");
    
    if (this.enableFileLogging) {
      this.initializeLogFile();
    }
  }

  private initializeLogFile(): void {
    const logDir = join(homedir(), ".ellygent");
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
    
    // Initialize log file with session start
    const timestamp = new Date().toISOString();
    writeFileSync(this.logFilePath, `\n=== Session started at ${timestamp} ===\n`, { flag: "a" });
  }

  private writeToFile(level: string, message: string, data?: unknown): void {
    if (!this.enableFileLogging) return;
    
    const timestamp = new Date().toISOString();
    const logLine = data 
      ? `[${timestamp}] [${level}] ${message} ${JSON.stringify(data)}\n`
      : `[${timestamp}] [${level}] ${message}\n`;
    
    try {
      appendFileSync(this.logFilePath, logLine);
    } catch (error) {
      // Silently fail if we can't write to log file
    }
  }

  error(message: string, data?: unknown): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(chalk.red("✗"), message);
      if (data && this.level >= LogLevel.DEBUG) {
        console.error(chalk.dim(JSON.stringify(data, null, 2)));
      }
    }
    this.writeToFile("ERROR", message, data);
  }

  warn(message: string, data?: unknown): void {
    if (this.quiet) return;
    
    if (this.level >= LogLevel.WARN) {
      console.warn(chalk.yellow("⚠"), message);
      if (data && this.level >= LogLevel.DEBUG) {
        console.warn(chalk.dim(JSON.stringify(data, null, 2)));
      }
    }
    this.writeToFile("WARN", message, data);
  }

  info(message: string, data?: unknown): void {
    if (this.quiet) return;
    
    if (this.level >= LogLevel.INFO) {
      console.log(chalk.blue("ℹ"), message);
      if (data && this.level >= LogLevel.DEBUG) {
        console.log(chalk.dim(JSON.stringify(data, null, 2)));
      }
    }
    this.writeToFile("INFO", message, data);
  }

  debug(message: string, data?: unknown): void {
    if (this.quiet) return;
    
    if (this.level >= LogLevel.DEBUG) {
      console.log(chalk.dim(`[DEBUG] ${message}`));
      if (data) {
        console.log(chalk.dim(JSON.stringify(data, null, 2)));
      }
    }
    this.writeToFile("DEBUG", message, data);
  }

  success(message: string): void {
    if (this.quiet) return;
    
    if (this.level >= LogLevel.INFO) {
      console.log(chalk.green("✓"), message);
    }
    this.writeToFile("INFO", `SUCCESS: ${message}`);
  }

  /**
   * Log HTTP request for debugging
   */
  logRequest(method: string, url: string, body?: unknown): void {
    if (this.level >= LogLevel.DEBUG) {
      this.debug(`${method} ${url}`);
      if (body) {
        this.debug("Request body:", body);
      }
    }
  }

  /**
   * Log HTTP response for debugging
   */
  logResponse(status: number, url: string, responseTime?: number, size?: number): void {
    if (this.level >= LogLevel.DEBUG) {
      let msg = `Response status: ${status}`;
      if (responseTime) msg += `, time: ${responseTime}ms`;
      if (size) msg += `, size: ${this.formatBytes(size)}`;
      this.debug(msg);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}
