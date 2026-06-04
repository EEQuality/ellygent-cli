export const endpoints = {
  context: {
    orgs: "/api/context/orgs",
    projects: (orgIdentifier: string) => `/api/context/orgs/${encodeURIComponent(orgIdentifier)}/projects`,
    versions: (projectIdentifier: string) =>
      `/api/context/projects/${encodeURIComponent(projectIdentifier)}/versions`,
    contents: (projectIdentifier: string, versionIdentifier: string) =>
      `/api/context/projects/${encodeURIComponent(projectIdentifier)}/versions/${encodeURIComponent(versionIdentifier)}/contents`,
    export: "/api/context/export"
  }
} as const;
