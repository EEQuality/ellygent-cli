export const endpoints = {
  context: {
    orgs: "context/orgs",
    projects: (orgIdentifier: string) => `context/orgs/${encodeURIComponent(orgIdentifier)}/projects`,
    versions: (projectIdentifier: string) =>
      `context/projects/${encodeURIComponent(projectIdentifier)}/versions`,
    contents: (projectIdentifier: string, versionIdentifier: string) =>
      `context/projects/${encodeURIComponent(projectIdentifier)}/versions/${encodeURIComponent(versionIdentifier)}/contents`,
    export: "context/export"
  },
  legacy: {
    export: (projectIdentifier: string, format: string, versionIdentifier?: string) => {
      const base = `backend/exportProject/${encodeURIComponent(projectIdentifier)}/?f=${format}`;
      return versionIdentifier ? `${base}&version=${encodeURIComponent(versionIdentifier)}` : base;
    }
  }
} as const;
