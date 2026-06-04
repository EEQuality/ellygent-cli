export class ApiError extends Error {
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, options: { status?: number; details?: unknown } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.details = options.details;
  }
}

export function userMessageForApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Authentication failed or your session expired. Run `ellygent auth login` and try again.";
    }
    if (error.status === 403) {
      return "You do not have permission to access this Ellygent resource.";
    }
    if (error.status === 404) {
      return error.message || "The requested Ellygent resource was not found.";
    }
    if (error.status && error.status >= 500) {
      return "Ellygent server returned an error. Try again later or contact your administrator.";
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
}
