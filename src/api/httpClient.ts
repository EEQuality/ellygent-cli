import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { ApiError, ApiNotFoundError, AuthenticationError, NetworkError } from "../errors/EllygentError.js";
import { Logger } from "../output/logger.js";
import { getServerUrlFromApiBase, joinApiUrl, normalizeApiBaseUrl } from "./baseUrl.js";
import { summarizeResponseBody } from "../errors/sanitize.js";

export interface HttpClientOptions {
  apiUrl: string;
  accessToken?: string;
  retryCount?: number;
  timeout?: number;
  logger?: Logger;
}

export class HttpClient {
  private readonly apiUrl: string;
  private readonly accessToken?: string;
  private readonly retryCount: number;
  private readonly timeout: number;
  private readonly logger?: Logger;

  constructor(options: HttpClientOptions) {
    this.apiUrl = normalizeApiBaseUrl(options.apiUrl);
    this.accessToken = options.accessToken;
    this.retryCount = options.retryCount ?? 3;
    this.timeout = options.timeout ?? 30000; // 30 seconds default
    this.logger = options.logger;
  }

  async getJson<T>(path: string): Promise<T> {
    const response = await this.request(path, { method: "GET" });
    return parseJson<T>(response);
  }

  async postJson<T>(path: string, body: unknown): Promise<T> {
    const response = await this.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return parseJson<T>(response);
  }

  async downloadToFile(path: string, body: unknown, targetPath: string): Promise<void> {
    const response = await this.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("zip") && !contentType.toLowerCase().includes("octet-stream")) {
      throw new ApiError(
        "Server did not return a ZIP package",
        response.status,
        {
          suggestions: [
            "Verify the project and version are correct",
            "Check if the content package is available"
          ],
          details: { contentType }
        }
      );
    }

    if (!response.body) {
      throw new ApiError(
        "Server returned an empty download response",
        response.status,
        {
          suggestions: ["Try again", "Contact your administrator if the problem persists"]
        }
      );
    }

    await pipeline(
      Readable.fromWeb(response.body as unknown as import("node:stream/web").ReadableStream<Uint8Array>),
      createWriteStream(targetPath)
    );
  }

  async downloadFromUrl(path: string, targetPath: string): Promise<void> {
    const response = await this.request(path, { method: "GET" });

    if (!response.body) {
      throw new ApiError(
        "Server returned an empty download response",
        response.status,
        {
          suggestions: ["Try again", "Contact your administrator if the problem persists"]
        }
      );
    }

    await pipeline(
      Readable.fromWeb(response.body as unknown as import("node:stream/web").ReadableStream<Uint8Array>),
      createWriteStream(targetPath)
    );
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const url = joinApiUrl(this.apiUrl, path);
    const headers = new Headers(init.headers);
    headers.set("Accept", headers.get("Accept") || "application/json");

    if (this.accessToken) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }

    const requestInit: RequestInit = {
      ...init,
      headers,
      signal: AbortSignal.timeout(this.timeout)
    };

    const startTime = Date.now();
    this.logger?.logRequest(init.method || "GET", url, init.body);

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      if (attempt > 0) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        this.logger?.debug(`Retrying request (attempt ${attempt + 1}/${this.retryCount + 1}) after ${backoffMs}ms`);
        await sleep(backoffMs);
      }

      try {
        const response = await fetch(url, requestInit);
        const responseTime = Date.now() - startTime;
        const contentLength = response.headers.get("content-length");
        this.logger?.logResponse(
          response.status,
          url,
          responseTime,
          contentLength ? parseInt(contentLength, 10) : undefined
        );

        if (!response.ok) {
          const error = await buildApiError(response, url);
          
          // Don't retry client errors (4xx) except 429 (rate limit)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw error;
          }

          // Retry server errors (5xx) and rate limits
          lastError = error;
          continue;
        }

        return response;
      } catch (error) {
        if (error instanceof ApiError || error instanceof AuthenticationError) {
          throw error;
        }

        // AbortSignal timeout
        if (error instanceof Error && error.name === "AbortError") {
          const diagnosticsUrl = joinApiUrl(this.apiUrl, "context/orgs");
          throw new NetworkError(`Request timeout after ${this.timeout}ms`, {
            suggestions: [
              "Check your internet connection",
              "Try again with a longer timeout",
              `Verify the Ellygent API is responding: curl ${diagnosticsUrl}`
            ],
            details: { url, timeout: this.timeout }
          });
        }

        // Network errors (DNS, connection refused, etc.)
        if (error instanceof Error && !("status" in error)) {
          const diagnosticsUrl = joinApiUrl(this.apiUrl, "context/orgs");
          const networkError = new NetworkError(
            `Could not reach ${getServerUrlFromApiBase(this.apiUrl)}`,
            {
              cause: error,
              suggestions: [
                "Check your internet connection",
                `Verify the Ellygent server URL is correct: ${getServerUrlFromApiBase(this.apiUrl)}`,
                `Check if the backend API is accessible: curl ${diagnosticsUrl}`
              ],
              details: {
                configuredServerUrl: getServerUrlFromApiBase(this.apiUrl),
                normalizedApiBaseUrl: this.apiUrl,
                requestedUrl: url,
                originalError: error.message
              }
            }
          );
          
          // Retry network errors
          lastError = networkError;
          continue;
        }

        // API errors or other errors - let them throw immediately
        throw error;
      }
    }

    // All retries exhausted
    throw lastError || new NetworkError(`Request failed after ${this.retryCount + 1} attempts`);
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new ApiError(
      "Server returned malformed JSON",
      response.status,
      {
        cause: error instanceof Error ? error : undefined,
        suggestions: [
          "This may be a server-side error",
          "Contact your administrator if the problem persists"
        ]
      }
    );
  }
}

export async function buildApiError(response: Response, url: string): Promise<ApiError | AuthenticationError> {
  const status = response.status;
  let detail = response.statusText || `HTTP ${status}`;
  let details: unknown;
  const contentType = response.headers.get("content-type") || "";
  const apiBaseUrl = deriveApiBaseFromRequestUrl(url);
  const serverUrl = getServerUrlFromApiBase(apiBaseUrl);
  const duplicatedApiPath = /\/api\/api(?:\/|$)/i.test(new URL(url).pathname);

  try {
    if (contentType.includes("application/json")) {
      details = await response.json();
      if (isObject(details) && typeof details.detail === "string") {
        detail = details.detail;
      } else {
        detail = JSON.stringify(details);
      }
    } else {
      const text = (await response.text()).trim();
      if (text) {
        const summary = summarizeResponseBody(text, status, contentType);
        detail = summary.responseSummary;
        details = summary;
      }
    }
  } catch {
    // Keep status text.
  }

  // Map specific status codes to domain errors
  if (status === 401 || status === 403) {
    return new AuthenticationError(
      status === 401 ? "Authentication failed or your token expired" : "Permission denied",
      {
        suggestions: [
          "Run 'ellygent auth login --token <PAT>' to re-authenticate",
          "Check your credentials with 'ellygent whoami'",
          "Verify you have access to this resource"
        ],
        details: { url, status, responseBody: details }
      }
    );
  }

  // General API error with helpful suggestions
  const suggestions: string[] = [];
  if (status === 404) {
    const probableCause = duplicatedApiPath
      ? "API base URL normalization appended /api more than once."
      : "Backend API route is missing, misrouted, or the API base URL was built incorrectly.";
    const diagnosticsLines = [
      duplicatedApiPath
        ? "The CLI generated an invalid API URL containing duplicated /api."
        : "The server was reached, but the backend API endpoint was not found.",
      "This usually means the backend API route is not available at the configured server URL.",
      `Configured server URL: ${serverUrl}`,
      `Normalized API base URL: ${apiBaseUrl}`,
      `Requested URL: ${url}`,
      `HTTP status: ${status}`
    ];

    return new ApiNotFoundError(diagnosticsLines.join("\n"), status, {
      suggestions: [
        duplicatedApiPath
          ? "Fix URL normalization so server URLs ending with /api do not receive another /api prefix."
          : "Verify that the backend API route is deployed.",
        duplicatedApiPath
          ? `Check the configured server URL and retry: curl ${url.replace("/api/api/", "/api/")}`
          : "Verify that /api/context/* is routed to the backend.",
        "Check the configured server URL.",
        `Run: curl ${joinApiUrl(apiBaseUrl, "context/orgs")}`
      ],
      details: {
        configuredServerUrl: serverUrl,
        normalizedApiBaseUrl: apiBaseUrl,
        requestedUrl: url,
        httpStatus: status,
        contentType,
        probableCause,
        ...(isObject(details) ? details as Record<string, unknown> : {})
      }
    });
  } else if (status === 429) {
    suggestions.push("Wait a few seconds and try again");
    suggestions.push("Reduce request frequency");
  } else if (status >= 500) {
    suggestions.push("Wait a moment and try again");
    suggestions.push("Contact your administrator if the problem persists");
  } else {
    suggestions.push("Check the error message above for details");
    suggestions.push("Use --debug for more information");
  }

  return new ApiError(detail, status, {
    suggestions,
    details: {
      requestedUrl: url,
      httpStatus: status,
      contentType,
      ...(isObject(details) ? details as Record<string, unknown> : {})
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isObject(value: unknown): value is { detail?: unknown } {
  return typeof value === "object" && value !== null;
}

function deriveApiBaseFromRequestUrl(url: string): string {
  const parsed = new URL(url);
  const segments = parsed.pathname.split("/").filter(Boolean);
  const apiIndex = segments.indexOf("api");
  const serverPath = apiIndex > 0 ? `/${segments.slice(0, apiIndex).join("/")}` : "";

  return normalizeApiBaseUrl(`${parsed.origin}${serverPath}`);
}
