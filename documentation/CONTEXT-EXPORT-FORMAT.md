# Context Export Format

The default `ellygent context pull` command installs a Context API package into `.ellygent/`. Schema version 2 organizes Markdown by engineering hierarchy:

```text
.ellygent/
├── manifest.json
├── project-summary.md
├── relations.json
├── system-definition.md
└── requirements/
    ├── Autonomous Vacuum Robot.md
    ├── Navigation.md
    └── Safety Goals.md
```

## Hierarchy documents

Each non-System-Definition specification produces one Markdown file in `requirements/`. The specification is the single H1; its hierarchy entries use H2 and deeper headings. The exporter does not create a file for each requirement.

Requirement headings begin with their public identifier and use horizontal separators. Breadcrumbs show the project, document, and ancestor chain; immediate children are linked. Documents with at least five hierarchy entries receive a linked contents section.

Filenames use specification titles, preserve readable Unicode, remove characters prohibited by common operating systems, protect Windows reserved names, and add deterministic numeric suffixes for duplicate titles. Internal/public identifiers remain in HTML comments near their headings without dominating the document.

## System Definition

`system-definition.md` is always emitted at the package root. It combines every exported specification marked as System Definition, retaining each complete hierarchy. Categories are discovered from project data rather than a hardcoded list, so future and custom categories are included automatically.

The filename is always lowercase and hyphenated. Consumers must not look for `System Definition.md` or the schema 1 path `architecture/system-definitions.md`.

Known System Definition types use domain-aware ordering. Operational Scenarios, Actors, and System Capabilities have dedicated engineering renderers. Other structured values use a generic recursive fallback, so JSON objects and arrays are never dumped directly into Markdown.

## Machine-readable relations

`relations.json` is always emitted at the package root and is the canonical traceability export. Schema version `1` contains one deterministic, deduplicated row per exported directed relationship:

```json
{
  "schema_version": 1,
  "project": "tractor_control",
  "relations": [
    {
      "source": "REQ-021",
      "source_title": "Detect Floor Transition",
      "source_type": "functional",
      "source_hierarchies": [{
          "specification": "navigation",
          "document": "requirements/Navigation.md",
          "parent": null,
          "depth": 0,
          "path": ["REQ-021"]
      }],
      "relation": "refines",
      "relation_identifier": "specrelationtype-refines",
      "target": "CAP-004",
      "target_title": "Surface Adaptation",
      "target_type": "system_capability",
      "target_hierarchies": [{
          "specification": "system-capabilities",
          "document": "system-definition.md",
          "parent": null,
          "depth": 0,
          "path": ["CAP-004"]
      }]
    }
  ]
}
```

Object and relation-type identifiers are public ReqIF alternative IDs. `relation` is the normalized readable type, while `relation_identifier` preserves the exact public type identity. Hierarchy arrays preserve every placement of an object and are empty only when an exported endpoint has no hierarchy placement.

## Markdown conventions

- One H1 per hierarchy document; child depth follows the source hierarchy. Beyond Markdown's H6 limit, repeated `↳` markers retain visible nesting depth.
- Existing metadata is shown compactly, for example `*Functional · Draft*`.
- Delimited and structured list fields render as Markdown lists instead of semicolon-separated strings.
- Empty descriptions, rationales, attributes, and relation sections are omitted.
- XHTML paragraphs, lists, tables, emphasis, code, hyperlinks, and images are converted structurally.
- Hidden content and editor-only controls are removed during XHTML conversion.
- Relations use human-readable types and target titles, with Markdown links when the target document is exported.
- UTF-8 output, field ordering, filenames, JSON keys, ZIP entry order, and ZIP timestamps are deterministic.

## Manifest and summary

`manifest.json` uses schema version `2.0`, declares `export_layout: "hierarchy_documents"`, and includes requirement, System Definition, and relation counts. Existing project, version, generated-at, and boolean `contents` fields remain available.

`project-summary.md` reports exported hierarchy counts and links to `system-definition.md` and each requirement hierarchy document.

## Compatibility

Schema 2 is intentionally breaking for tools that enumerate one Markdown file per requirement. Update consumers to treat each file under `requirements/` as a complete hierarchy and parse headings or preserved identifiers when node-level navigation is needed. Pull authentication, multi-tenant permission checks, project/version identifiers, optional JSON assets, and atomic workspace replacement are unchanged.
