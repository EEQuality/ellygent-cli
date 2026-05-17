export interface OrganizationSummary {
  identifier: string;
  name: string;
}

export interface ProjectSummary {
  identifier: string;
  name: string;
  description: string;
}

export type VersionType = "live" | "baseline";

export interface VersionSummary {
  identifier: string;
  name: string;
  description: string;
  type: VersionType;
}

export interface ContextContents {
  system_definitions: ContextNamedItem[];
  specifications: ContextNamedItem[];
  traceability: {
    available: boolean;
    relationship_count: number;
  };
  architecture: Availability;
  constraints: Availability;
  glossary: Availability;
}

export interface ContextNamedItem {
  identifier: string;
  name: string;
}

export interface Availability {
  available: boolean;
}

export interface ContextExportSelection {
  system_definitions?: string[];
  specifications?: string[];
  include_traceability?: boolean;
  include_architecture?: boolean;
  include_constraints?: boolean;
  include_glossary?: boolean;
  include_ai_summaries?: boolean;
}

export interface ContextExportRequest {
  project_identifier: string;
  version_identifier: string;
  selection: ContextExportSelection;
  format: "zip";
}

export interface PackageManifest {
  schema_version: string;
  project: {
    identifier: string;
    name: string;
  };
  version: {
    identifier: string;
    type: string;
  };
  generated_at: string;
  contents: Record<string, boolean>;
}
