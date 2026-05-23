import chalk from "chalk";
import { EllygentError } from "./EllygentError.js";
import { OutputController } from "../output/OutputController.js";

/**
 * Presents errors in a user-friendly format
 * Respects output modes (JSON, quiet, verbose, debug)
 */
export class ErrorPresenter {
  constructor(private readonly output: OutputController) {}

  /**
   * Present an error to the user
   * Sets appropriate exit code
   */
  present(error: unknown): void {
    // Determine error details
    const ellygentError = this.toEllygentError(error);
    
    // Set exit code
    process.exitCode = ellygentError.exitCode;
    
    // Output based on mode
    if (this.output.isJson()) {
      this.presentJson(ellygentError);
    } else {
      this.presentHuman(ellygentError);
    }
    
    // Log to debug
    this.output.debug("Error occurred", {
      name: ellygentError.name,
      message: ellygentError.message,
      exitCode: ellygentError.exitCode,
      stack: ellygentError.stack
    });
    
    // Flush output
    this.output.complete();
  }

  /**
   * Convert unknown error to EllygentError
   */
  private toEllygentError(error: unknown): EllygentError {
    if (error instanceof EllygentError) {
      return error;
    }
    
    if (error instanceof Error) {
      return new EllygentError(error.message, {
        exitCode: 1,
        details: { originalError: error.name },
        cause: error
      });
    }
    
    // Unknown error type
    const message = typeof error === "string" ? error : "An unknown error occurred";
    return new EllygentError(message, { exitCode: 1 });
  }

  /**
   * Present error in JSON format
   */
  private presentJson(error: EllygentError): void {
    this.output.data(error.toJSON());
  }

  /**
   * Present error in human-readable format
   */
  private presentHuman(error: EllygentError): void {
    // Main error message
    this.output.error(error.message);
    
    // Additional details in verbose/debug mode
    if (this.output.isVerbose() && error.details) {
      console.error(chalk.dim("\nDetails:"));
      for (const [key, value] of Object.entries(error.details)) {
        console.error(chalk.dim(`  ${key}: ${JSON.stringify(value)}`));
      }
    }
    
    // Suggestions (unless quiet)
    if (!this.output.isQuiet() && error.suggestions && error.suggestions.length > 0) {
      console.error(chalk.yellow("\nSuggestions:"));
      for (const suggestion of error.suggestions) {
        console.error(chalk.yellow(`  • ${suggestion}`));
      }
    }
    
    // Stack trace in debug mode
    if (this.output.isDebug() && error.stack) {
      console.error(chalk.dim("\nStack trace:"));
      console.error(chalk.dim(error.stack));
    }
  }
}

/**
 * Helper function to present error with output controller
 */
export function presentError(error: unknown, output: OutputController): void {
  const presenter = new ErrorPresenter(output);
  presenter.present(error);
}
