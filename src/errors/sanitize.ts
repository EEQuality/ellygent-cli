const MAX_PREVIEW_LENGTH = 200;

export function sanitizeErrorString(value: string): string {
  const redacted = redactSecrets(String(value ?? ""));
  const trimmed = redacted.trim();

  if (looksLikeHtml(trimmed)) {
    return summarizeHtml(trimmed);
  }

  return trimmed.length > MAX_PREVIEW_LENGTH
    ? `${trimmed.slice(0, MAX_PREVIEW_LENGTH)}...`
    : trimmed;
}

export function sanitizeErrorData(value: unknown, keyPath = ""): unknown {
  if (value == null) {
    return value;
  }

  if (typeof value === "string") {
    if (isSensitiveKey(keyPath)) {
      return "<redacted>";
    }

    return sanitizeErrorString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeErrorData(item, `${keyPath}[${index}]`));
  }

  if (typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      const nextPath = keyPath ? `${keyPath}.${key}` : key;
      sanitized[key] = isSensitiveKey(nextPath)
        ? "<redacted>"
        : sanitizeErrorData(nestedValue, nextPath);
    }
    return sanitized;
  }

  return String(value);
}

export function summarizeResponseBody(body: string, status?: number, contentType?: string): {
  responseSummary: string;
  responsePreview?: string;
} {
  const sanitized = redactSecrets(body).trim();
  const normalizedType = (contentType || "").toLowerCase();

  if (!sanitized) {
    return {
      responseSummary: "The server returned an empty response body."
    };
  }

  if (looksLikeHtml(sanitized) || normalizedType.includes("text/html")) {
    const responseSummary = status === 404
      ? "Received HTML 404 page instead of JSON API response."
      : "Received HTML response instead of JSON. This usually indicates that the request reached the frontend or a non-API route.";

    return { responseSummary };
  }

  if (sanitized.length > MAX_PREVIEW_LENGTH) {
    return {
      responseSummary: "Received non-JSON error response from the server.",
      responsePreview: `${sanitized.slice(0, MAX_PREVIEW_LENGTH)}...`
    };
  }

  return {
    responseSummary: "Received non-JSON error response from the server.",
    responsePreview: sanitized
  };
}

function redactSecrets(value: string): string {
  return value
    .replace(/elly_pat_[A-Za-z0-9_-]+/g, "<redacted>")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer <redacted>")
    .replace(/(authorization["']?\s*[:=]\s*["']?)[^"',\s}]+/gi, "$1<redacted>")
    .replace(/((?:access|refresh|session|id)?_?token["']?\s*[:=]\s*["']?)[^"',\s}]+/gi, "$1<redacted>")
    .replace(/((?:cookie|session)["']?\s*[:=]\s*["']?)[^"',\s}]+/gi, "$1<redacted>")
    .replace(/([?&](?:token|access_token|refresh_token|session|cookie)=)[^&\s]+/gi, "$1<redacted>");
}

function looksLikeHtml(value: string): boolean {
  return /<!DOCTYPE html|<html[\s>]|<head[\s>]|<body[\s>]|__NEXT_DATA__/i.test(value);
}

function summarizeHtml(value: string): string {
  if (/__NEXT_DATA__/i.test(value)) {
    return "Received HTML response instead of JSON. This appears to be a Next.js frontend page rather than the backend API.";
  }

  if (/not found|404/i.test(value)) {
    return "Received HTML 404 page instead of JSON API response.";
  }

  return "Received HTML response instead of JSON. This usually indicates that the request reached the frontend or a 404 page instead of the backend API.";
}

function isSensitiveKey(keyPath: string): boolean {
  return /(authorization|token|accessToken|refreshToken|cookie|session)/i.test(keyPath);
}
