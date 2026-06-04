import { ConfigError } from "../config/configStore.js";

export function normalizeApiBaseUrl(input: string): string {
  const trimmed = String(input || "").trim();
  if (!trimmed) {
    return "";
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ConfigError("Ellygent server URL must be a valid absolute URL");
  }

  parsed.search = "";
  parsed.hash = "";

  const segments = parsed.pathname
    .split("/")
    .filter(Boolean);

  while (segments[segments.length - 1] === "api") {
    segments.pop();
  }

  const serverPath = segments.length > 0 ? `/${segments.join("/")}` : "";
  parsed.pathname = `${serverPath}/api`;

  return parsed.toString().replace(/\/$/, "");
}

export function getServerUrlFromApiBase(apiBaseUrl: string): string {
  const apiBase = normalizeApiBaseUrl(apiBaseUrl);
  if (!apiBase) {
    return "";
  }

  const parsed = new URL(apiBase);
  const segments = parsed.pathname
    .split("/")
    .filter(Boolean);

  while (segments[segments.length - 1] === "api") {
    segments.pop();
  }

  parsed.pathname = segments.length > 0 ? `/${segments.join("/")}` : "/";
  return parsed.toString().replace(/\/$/, "");
}

export function joinApiUrl(apiBaseUrl: string, endpoint: string): string {
  const normalizedBase = normalizeApiBaseUrl(apiBaseUrl);
  const normalizedEndpoint = normalizeEndpointPath(endpoint);

  return `${normalizedBase}/${normalizedEndpoint}`;
}

function normalizeEndpointPath(endpoint: string): string {
  const trimmed = String(endpoint || "").trim().replace(/^\/+/, "");
  if (!trimmed) {
    return "";
  }

  if (trimmed === "api") {
    return "";
  }

  if (trimmed.startsWith("api/")) {
    return trimmed.slice(4);
  }

  return trimmed;
}
