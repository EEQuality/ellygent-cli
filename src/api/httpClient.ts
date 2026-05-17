import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { ApiError } from "./errors.js";

export interface HttpClientOptions {
  apiUrl: string;
  accessToken?: string;
}

export class HttpClient {
  private readonly apiUrl: string;
  private readonly accessToken?: string;

  constructor(options: HttpClientOptions) {
    this.apiUrl = options.apiUrl.replace(/\/+$/, "");
    this.accessToken = options.accessToken;
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
      throw new ApiError("Ellygent did not return a ZIP package", { status: response.status });
    }

    if (!response.body) {
      throw new ApiError("Ellygent returned an empty download response", { status: response.status });
    }

    await pipeline(
      Readable.fromWeb(response.body as unknown as import("node:stream/web").ReadableStream<Uint8Array>),
      createWriteStream(targetPath)
    );
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const url = `${this.apiUrl}${path}`;
    const headers = new Headers(init.headers);
    headers.set("Accept", headers.get("Accept") || "application/json");

    if (this.accessToken) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }

    let response: Response;
    try {
      response = await fetch(url, { ...init, headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network request failed";
      throw new ApiError(`Could not reach Ellygent at ${this.apiUrl}: ${message}`);
    }

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response;
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError("Ellygent returned malformed JSON", { status: response.status });
  }
}

async function buildApiError(response: Response): Promise<ApiError> {
  const status = response.status;
  let detail = response.statusText || `HTTP ${status}`;
  let details: unknown;

  try {
    const contentType = response.headers.get("content-type") || "";
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
        detail = text;
      }
    }
  } catch {
    // Keep status text.
  }

  return new ApiError(detail, { status, details });
}

function isObject(value: unknown): value is { detail?: unknown } {
  return typeof value === "object" && value !== null;
}
