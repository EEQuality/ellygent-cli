/**
 * Base error class for all Ellygent CLI errors
 * Provides exit codes, suggestions, and structured error details
 */
export class EllygentError extends Error {
  /** Exit code for the error */
  exitCode: number;
  
  /** Helpful suggestions for resolving the error */
  suggestions?: string[];
  
  /** Additional structured details about the error */
  details?: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      exitCode?: number;
      suggestions?: string[];
      details?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = this.constructor.name;
    this.exitCode = options?.exitCode ?? 1;
    this.suggestions = options?.suggestions;
    this.details = options?.details;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    
    // Preserve cause if provided
    if (options?.cause) {
      this.cause = options.cause;
    }
  }

  /**
   * Serialize error to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      error: this.name,
      message: this.message,
      exitCode: this.exitCode,
      suggestions: this.suggestions,
      details: this.details
    };
  }
}

/**
 * Authentication error (invalid/expired credentials)
 * Exit code: 2
 */
export class AuthenticationError extends EllygentError {
  constructor(message: string, options?: { suggestions?: string[]; details?: Record<string, unknown>; cause?: Error }) {
    super(message, {
      exitCode: 2,
      suggestions: options?.suggestions ?? [
        "Run 'ellygent auth login --token <PAT>' to re-authenticate",
        "Check token with 'ellygent auth status' or 'ellygent whoami'"
      ],
      details: options?.details,
      cause: options?.cause
    });
  }
}

/**
 * Validation error (invalid input, missing required fields)
 * Exit code: 3
 */
export class ValidationError extends EllygentError {
  constructor(message: string, options?: { suggestions?: string[]; details?: Record<string, unknown> }) {
    super(message, {
      exitCode: 3,
      suggestions: options?.suggestions ?? [
        "Use --help to see required options",
        "Check your input values"
      ],
      details: options?.details
    });
  }
}

/**
 * Network error (connection failed, timeout)
 * Exit code: 4
 */
export class NetworkError extends EllygentError {
  constructor(message: string, options?: { suggestions?: string[]; details?: Record<string, unknown>; cause?: Error }) {
    super(message, {
      exitCode: 4,
      suggestions: options?.suggestions ?? [
        "Check your internet connection",
        "Verify the API URL with 'ellygent config get api-url'",
        "Try again in a few moments"
      ],
      details: options?.details,
      cause: options?.cause
    });
  }
}

/**
 * API error (4xx/5xx HTTP responses)
 * Exit code: 5
 */
export class ApiError extends EllygentError {
  statusCode: number;
  responseBody?: unknown;

  constructor(
    message: string,
    statusCode: number,
    options?: { 
      suggestions?: string[];
      details?: Record<string, unknown>;
      responseBody?: unknown;
      cause?: Error;
    }
  ) {
    super(message, {
      exitCode: 5,
      suggestions: options?.suggestions ?? [
        "Check the API documentation for this endpoint",
        "Verify your permissions with 'ellygent auth status'",
        "Contact support if the issue persists"
      ],
      details: options?.details,
      cause: options?.cause
    });
    
    this.statusCode = statusCode;
    this.responseBody = options?.responseBody;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      responseBody: this.responseBody
    };
  }
}

/**
 * File system error (permissions, disk full, not found)
 * Exit code: 6
 */
export class FileSystemError extends EllygentError {
  path?: string;

  constructor(
    message: string,
    options?: {
      path?: string;
      suggestions?: string[];
      details?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, {
      exitCode: 6,
      suggestions: options?.suggestions ?? [
        "Check file/directory permissions",
        "Ensure sufficient disk space",
        "Verify the path exists"
      ],
      details: options?.details,
      cause: options?.cause
    });
    
    this.path = options?.path;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      path: this.path
    };
  }
}
