import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiNotFoundError, AuthenticationError, NetworkError } from "../errors/EllygentError.js";
import { buildApiError, HttpClient } from "./httpClient.js";
import { ErrorPresenter } from "../errors/ErrorPresenter.js";
import { OutputController, OutputMode } from "../output/OutputController.js";

describe("HttpClient", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("uses the normalized /api route for requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new HttpClient({ apiUrl: "https://www.ellygent.com", retryCount: 0 });
    await client.getJson("context/orgs");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.ellygent.com/api/context/orgs",
      expect.any(Object)
    );
  });

  it("does not classify HTTP 404 as a NetworkError", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("<html><body>Not Found</body></html>", {
        status: 404,
        statusText: "Not Found",
        headers: { "content-type": "text/html" }
      })
    ) as typeof fetch;

    const client = new HttpClient({ apiUrl: "https://www.ellygent.com", retryCount: 0 });

    await expect(client.getJson("context/orgs")).rejects.toBeInstanceOf(ApiNotFoundError);
    await expect(client.getJson("context/orgs")).rejects.not.toBeInstanceOf(NetworkError);
  });

  it("reports endpoint-not-found diagnostics for HTML 404 responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("<html><body>Not Found</body></html>", {
        status: 404,
        statusText: "Not Found",
        headers: { "content-type": "text/html" }
      })
    ) as typeof fetch;

    const client = new HttpClient({ apiUrl: "https://www.ellygent.com", accessToken: "elly_pat_secret_123", retryCount: 0 });

    await expect(client.getJson("context/orgs")).rejects.toMatchObject({
      message: expect.stringContaining("The server was reached, but the backend API endpoint was not found.")
    });

    try {
      await client.getJson("context/orgs");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiNotFoundError);
      const apiError = error as ApiNotFoundError;
      expect(apiError.message).toContain("Configured server URL: https://www.ellygent.com");
      expect(apiError.message).toContain("Normalized API base URL: https://www.ellygent.com/api");
      expect(apiError.message).toContain("Requested URL: https://www.ellygent.com/api/context/orgs");
      expect(apiError.message).toContain("HTTP status: 404");
      expect(apiError.message).not.toContain("elly_pat_secret_123");
      expect(JSON.stringify(apiError.toJSON())).not.toContain("<!DOCTYPE html>");
      expect(JSON.stringify(apiError.toJSON())).not.toContain("__NEXT_DATA__");
    }
  });

  it("uses backend API suggestions instead of root /health for network errors", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as typeof fetch;

    const client = new HttpClient({ apiUrl: "https://www.ellygent.com", retryCount: 0 });

    await expect(client.getJson("context/orgs")).rejects.toMatchObject({
      suggestions: expect.arrayContaining([
        "Check your internet connection",
        "Verify the Ellygent server URL is correct: https://www.ellygent.com",
        "Check if the backend API is accessible: curl https://www.ellygent.com/api/context/orgs"
      ])
    });
  });

  it("preserves JSON authentication errors without printing tokens", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Invalid token elly_pat_secret_123" }), {
        status: 401,
        statusText: "Unauthorized",
        headers: { "content-type": "application/json" }
      })
    ) as typeof fetch;

    const client = new HttpClient({ apiUrl: "https://www.ellygent.com", accessToken: "elly_pat_secret_123", retryCount: 0 });

    await expect(client.getJson("context/orgs")).rejects.toBeInstanceOf(AuthenticationError);

    try {
      await client.getJson("context/orgs");
    } catch (error) {
      const output = new OutputController({ mode: OutputMode.JSON });
      const presenter = new ErrorPresenter(output);
      const dataSpy = vi.spyOn(output, "data");

      presenter.present(error);
      expect(JSON.stringify(dataSpy.mock.calls[0][0])).not.toContain("elly_pat_secret_123");
    }
  });

  it("truncates large response body previews", async () => {
    const largeBody = `Error: ${"x".repeat(300)}`;
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(largeBody, {
        status: 500,
        statusText: "Server Error",
        headers: { "content-type": "text/plain" }
      })
    ) as typeof fetch;

    const client = new HttpClient({ apiUrl: "https://www.ellygent.com", retryCount: 0 });

    try {
      await client.getJson("context/orgs");
    } catch (error) {
      const payload = (error as Error & { toJSON?: () => unknown }).toJSON?.() as Record<string, unknown>;
      const details = payload.details as Record<string, unknown>;
      expect(String(details.responsePreview).length).toBeLessThanOrEqual(203);
    }
  });

  it("detects duplicated /api in requested URLs and explains the normalization issue", async () => {
    const response = new Response("<!DOCTYPE html><html><body>Not Found</body></html>", {
      status: 404,
      statusText: "Not Found",
      headers: { "content-type": "text/html" }
    });

    const error = await buildApiError(response, "https://www.ellygent.com/api/api/context/orgs");
    const payload = error.toJSON() as Record<string, unknown>;
    const details = payload.details as Record<string, unknown>;

    expect(error).toBeInstanceOf(ApiNotFoundError);
    expect(error.message).toContain("duplicated /api");
    expect(details.requestedUrl).toBe("https://www.ellygent.com/api/api/context/orgs");
    expect(details.probableCause).toBe("API base URL normalization appended /api more than once.");
    expect(JSON.stringify(payload)).not.toContain("<!DOCTYPE html>");
  });
});
