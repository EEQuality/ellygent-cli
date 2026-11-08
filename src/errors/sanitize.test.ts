import { describe, expect, it } from "vitest";
import { sanitizeErrorData, sanitizeErrorString } from "./sanitize.js";

describe("sandbox credential redaction", () => {
  it("redacts sandbox secrets in arbitrary messages and nested response payloads", () => {
    expect(sanitizeErrorString("failed elly_sb_super_secret_value")).toBe("failed <redacted>");
    expect(sanitizeErrorData({ detail: "bad elly_sb_super_secret_value", token: "anything" })).toEqual({ detail: "bad <redacted>", token: "<redacted>" });
  });
});
