import { describe, it, expect, afterEach, vi } from "vitest";
import { loadFromEnv, normalizeApiUrl, ConfigError } from "../config/configStore.js";

describe("loadFromEnv", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("loads ELLYGENT_API_URL from environment and normalizes it to /api", () => {
    process.env.ELLYGENT_API_URL = "https://www.ellygent.com";

    const config = loadFromEnv();

    expect(config.apiUrl).toBe("https://www.ellygent.com/api");
  });

  it("loads ELLYGENT_TOKEN as accessToken", () => {
    process.env.ELLYGENT_TOKEN = "test_token_123";

    const config = loadFromEnv();

    expect(config.accessToken).toBe("test_token_123");
  });

  it("loads ELLYGENT_ORG as defaultOrg", () => {
    process.env.ELLYGENT_ORG = "my-org";

    const config = loadFromEnv();

    expect(config.defaultOrg).toBe("my-org");
  });

  it("loads ELLYGENT_PROJECT as defaultProject", () => {
    process.env.ELLYGENT_PROJECT = "my-project";

    const config = loadFromEnv();

    expect(config.defaultProject).toBe("my-project");
  });

  it("returns empty object when no env vars set", () => {
    delete process.env.ELLYGENT_API_URL;
    delete process.env.ELLYGENT_TOKEN;
    delete process.env.ELLYGENT_ORG;
    delete process.env.ELLYGENT_PROJECT;

    const config = loadFromEnv();

    expect(config).toEqual({});
  });

  it("warns on invalid API URL but continues", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.ELLYGENT_API_URL = "not-a-url";

    const config = loadFromEnv();

    expect(config.apiUrl).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid ELLYGENT_API_URL"));

    warnSpy.mockRestore();
  });
});

describe("normalizeApiUrl", () => {
  it("normalizes a root production URL to /api", () => {
    expect(normalizeApiUrl("https://www.ellygent.com")).toBe("https://www.ellygent.com/api");
    expect(normalizeApiUrl("https://www.ellygent.com/")).toBe("https://www.ellygent.com/api");
  });

  it("normalizes a production URL that already includes /api", () => {
    expect(normalizeApiUrl("https://www.ellygent.com/api")).toBe("https://www.ellygent.com/api");
    expect(normalizeApiUrl("https://www.ellygent.com/api/")).toBe("https://www.ellygent.com/api");
  });

  it("normalizes localhost development URLs to /api and keeps http", () => {
    expect(normalizeApiUrl("http://127.0.0.1:8000")).toBe("http://127.0.0.1:8000/api");
    expect(normalizeApiUrl("http://127.0.0.1:8000/api/")).toBe("http://127.0.0.1:8000/api");
  });

  it("removes query string and fragment", () => {
    expect(normalizeApiUrl("https://www.ellygent.com/?foo=bar#section")).toBe("https://www.ellygent.com/api");
  });

  it("trims whitespace", () => {
    expect(normalizeApiUrl("  https://www.ellygent.com  ")).toBe("https://www.ellygent.com/api");
  });

  it("throws on invalid URL", () => {
    expect(() => normalizeApiUrl("not-a-url")).toThrow(ConfigError);
    expect(() => normalizeApiUrl("not-a-url")).toThrow("Ellygent server URL must be a valid absolute URL");
  });

  it("throws on relative URL", () => {
    expect(() => normalizeApiUrl("/api")).toThrow(ConfigError);
  });

  it("returns empty string for empty input", () => {
    expect(normalizeApiUrl("")).toBe("");
  });
});
