import type {
  ContextContents,
  ContextExportRequest,
  OrganizationSummary,
  ProjectSummary,
  VersionSummary
} from "../types/context.js";
import { endpoints } from "./endpoints.js";
import { HttpClient } from "./httpClient.js";

export class ContextApiClient {
  private readonly http: HttpClient;

  constructor(apiUrl: string, accessToken: string) {
    this.http = new HttpClient({ apiUrl, accessToken });
  }

  listOrganizations(): Promise<OrganizationSummary[]> {
    return this.http.getJson<OrganizationSummary[]>(endpoints.context.orgs);
  }

  listProjects(orgIdentifier: string): Promise<ProjectSummary[]> {
    return this.http.getJson<ProjectSummary[]>(endpoints.context.projects(orgIdentifier));
  }

  listVersions(projectIdentifier: string): Promise<VersionSummary[]> {
    return this.http.getJson<VersionSummary[]>(endpoints.context.versions(projectIdentifier));
  }

  getContents(projectIdentifier: string, versionIdentifier: string): Promise<ContextContents> {
    return this.http.getJson<ContextContents>(endpoints.context.contents(projectIdentifier, versionIdentifier));
  }

  downloadContextPackage(payload: ContextExportRequest, targetPath: string): Promise<void> {
    return this.http.downloadToFile(endpoints.context.export, payload, targetPath);
  }
}
