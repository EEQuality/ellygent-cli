import { describe, expect, it } from "vitest";
import { getServerUrlFromApiBase, joinApiUrl, normalizeApiBaseUrl } from "./baseUrl.js";

describe("normalizeApiBaseUrl", () => {
  it("normalizes server URLs to a canonical /api base", () => {
    expect(normalizeApiBaseUrl("https://www.ellygent.com")).toBe("https://www.ellygent.com/api");
    expect(normalizeApiBaseUrl("https://www.ellygent.com/")).toBe("https://www.ellygent.com/api");
    expect(normalizeApiBaseUrl("https://www.ellygent.com/api")).toBe("https://www.ellygent.com/api");
    expect(normalizeApiBaseUrl("https://www.ellygent.com/api/")).toBe("https://www.ellygent.com/api");
    expect(normalizeApiBaseUrl("https://www.ellygent.com/api/api/")).toBe("https://www.ellygent.com/api");
  });

  it("normalizes localhost URLs and preserves http", () => {
    expect(normalizeApiBaseUrl("http://127.0.0.1:8000")).toBe("http://127.0.0.1:8000/api");
    expect(normalizeApiBaseUrl("http://127.0.0.1:8000/api/")).toBe("http://127.0.0.1:8000/api");
  });
});

describe("joinApiUrl", () => {
  it("joins endpoints without creating /api/api", () => {
    expect(joinApiUrl("https://www.ellygent.com", "context/orgs")).toBe(
      "https://www.ellygent.com/api/context/orgs"
    );
    expect(joinApiUrl("https://www.ellygent.com/api/", "/api/context/orgs")).toBe(
      "https://www.ellygent.com/api/context/orgs"
    );
  });
});

describe("getServerUrlFromApiBase", () => {
  it("returns the original server URL without /api", () => {
    expect(getServerUrlFromApiBase("https://www.ellygent.com/api")).toBe("https://www.ellygent.com");
    expect(getServerUrlFromApiBase("http://127.0.0.1:8000/api")).toBe("http://127.0.0.1:8000");
    expect(getServerUrlFromApiBase("https://www.ellygent.com/api/api")).toBe("https://www.ellygent.com");
  });
});
