import { describe, expect, it } from "vitest";
import { endpoints } from "./endpoints.js";
import { joinApiUrl } from "./baseUrl.js";

describe("scoped CLI read endpoint compatibility", () => {
  it("uses canonical context discovery and read-producing export paths", () => {
    expect(endpoints.context.orgs).toBe("context/orgs");
    expect(endpoints.context.projects("org")).toBe("context/orgs/org/projects");
    expect(endpoints.context.versions("project")).toBe("context/projects/project/versions");
    expect(endpoints.context.contents("project", "live")).toBe("context/projects/project/versions/live/contents");
    expect(endpoints.context.export).toBe("context/export");
  });
  it("uses the registered case-sensitive ReqIF export route under the API base", () => {
    const path = endpoints.legacy.export("project/id", "reqifz", "version/id");
    expect(joinApiUrl("https://example.invalid/api", path)).toBe("https://example.invalid/api/v1/ExportProject/project%2Fid/?f=reqifz&version=version%2Fid");
  });
});
