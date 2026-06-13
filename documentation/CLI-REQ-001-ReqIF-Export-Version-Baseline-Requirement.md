# CLI-REQ-001: ReqIF Export Version/Baseline Requirement

**Status**: Approved  
**Priority**: High  
**Date**: 2026-06-13  
**Author**: System Requirements

---

## Problem Statement

ReqIF export represents a formal baseline/snapshot intended for data interchange and archival. Exporting ReqIF from mutable `MAIN` / live project state risks producing unstable or non-baselined files that may not represent a verified, approved configuration.

Currently:
- The backend export endpoint allows ReqIF export from either a specific version OR from the current/MAIN state
- The CLI `pull` command does not support ReqIF export format
- There is no enforcement preventing ReqIF export from mutable project state

This creates a risk of inadvertently distributing ReqIF files that:
- Do not represent an approved baseline
- May change unexpectedly if re-exported
- Cannot be reliably traced to a specific project state
- Violate configuration management best practices

---

## Requirements

### CLI-REQ-001.1: CLI Pull Format Support

The CLI `pull` command **shall** support a `--format` option with the following values:
- `context` (default) - Current context package behavior
- `markdown` - Markdown export
- `reqif` - ReqIF XML export
- `reqifz` - ReqIF ZIP archive export

**Rationale**: Users need the ability to export projects in multiple formats for different use cases.

---

### CLI-REQ-001.2: ReqIF Format Version Requirement

The CLI `pull` command **shall** reject ReqIF and ReqIFZ export requests when:
- `--version` parameter is not provided, OR
- `--version` is set to `MAIN`, `main`, or equivalent live-state alias

**Rationale**: ReqIF exports must represent immutable baselines, not mutable project state.

---

### CLI-REQ-001.3: ReqIF Export Error Message

When a ReqIF export is rejected per CLI-REQ-001.2, the CLI **shall** display:

```
Error: ReqIF export requires a specific project version.
Exporting ReqIF from MAIN is not allowed.

Create or select a project version and retry with --version <version-identifier>

Example:
  ellygent pull --project <project> --version <version> --format reqif --out ./project.reqif
```

**Rationale**: Clear, actionable error messages guide users to the correct usage pattern.

---

### CLI-REQ-001.4: Non-ReqIF Format Flexibility

The CLI `pull` command **shall** allow `context` and `markdown` format exports from `MAIN` version.

**Rationale**: Context packages and markdown exports are intended for working state visibility and do not represent formal baselines.

---

### CLI-REQ-001.5: Backend Validation Enforcement

The backend export endpoint **shall** enforce the version requirement for ReqIF/ReqIFZ formats by:
- Rejecting requests where version is `None`, `MAIN`, `main`, or equivalent
- Returning HTTP 400 with a clear error message
- Logging the rejection attempt for audit purposes

**Rationale**: Defense in depth - backend must enforce the rule even if CLI validation is bypassed.

---

### CLI-REQ-001.6: Backend Error Response

When the backend rejects a ReqIF export per CLI-REQ-001.5, it **shall** return:

**Status**: `400 Bad Request`

**Body**:
```json
{
  "detail": "ReqIF export requires a specific project version. Exporting from MAIN or live state is not allowed. Create a version and retry with the version identifier."
}
```

**Rationale**: Consistent error messaging across CLI and API.

---

### CLI-REQ-001.7: Export Manifest Version Metadata

For ReqIF/ReqIFZ exports, the export metadata logged/tracked **shall** include:
- Organization identifier
- Project identifier
- Project name
- Version identifier
- Version name/label (if available)
- Export format (`reqif` or `reqifz`)
- Export timestamp (ISO 8601)
- Indication that source is a version/baseline (not MAIN)

**Rationale**: Audit trail and traceability for formal exports.

---

### CLI-REQ-001.8: Version Snapshot Integrity

When exporting ReqIF for a specific version, the backend **shall**:
- Load content from the selected version snapshot
- NOT include any changes made to the project after the version was created
- Ensure the export reflects exactly the state at the time the version was created

**Rationale**: Version exports must be immutable and reproducible.

---

## Valid Usage Examples

### Valid - ReqIF export with specific version
```bash
ellygent pull --project tractor_control --version baseline-1.0.0 --format reqif --out ./tractor.reqif
```

### Valid - ReqIFZ export with specific version
```bash
ellygent pull --project safety_system --version v2.1.0 --format reqifz --out ./safety.reqifz
```

### Valid - Context export from MAIN (allowed)
```bash
ellygent pull --project tractor_control --version main --format context
```

### Valid - Markdown export from MAIN (allowed)
```bash
ellygent pull --project tractor_control --version main --format markdown --out ./tractor.md
```

---

## Invalid Usage Examples

### Invalid - ReqIF export without version
```bash
ellygent pull --project tractor_control --format reqif --out ./tractor.reqif
```
**Error**: ReqIF export requires a specific project version.

### Invalid - ReqIF export from MAIN
```bash
ellygent pull --project tractor_control --version MAIN --format reqif --out ./tractor.reqif
```
**Error**: Exporting ReqIF from MAIN is not allowed.

### Invalid - ReqIF export from main (lowercase)
```bash
ellygent pull --project safety_system --version main --format reqif --out ./safety.reqif
```
**Error**: Exporting ReqIF from MAIN is not allowed.

---

## Test Coverage

### CLI Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| CLI-TC-001.1 | `pull --format reqif --version <valid>` | Calls export endpoint, writes .reqif file |
| CLI-TC-001.2 | `pull --format reqif` (no version) | Fails with clear error before or during request |
| CLI-TC-001.3 | `pull --format reqif --version MAIN` | Fails with clear error |
| CLI-TC-001.4 | `pull --format reqif --version main` | Fails with clear error |
| CLI-TC-001.5 | `pull --format reqifz --version <valid>` | Calls export endpoint, writes .reqifz file |
| CLI-TC-001.6 | `pull --format reqifz --version MAIN` | Fails with clear error |
| CLI-TC-001.7 | `pull --format context --version main` | Succeeds (context allows MAIN) |
| CLI-TC-001.8 | `pull --format markdown --version main` | Succeeds (markdown allows MAIN) |

### Backend Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| BE-TC-001.1 | Export ReqIF with valid version | Returns non-empty .reqif file |
| BE-TC-001.2 | Export ReqIF without version | Returns 400 with clear error |
| BE-TC-001.3 | Export ReqIF with `version=MAIN` | Returns 400 with clear error |
| BE-TC-001.4 | Export ReqIF with `version=main` | Returns 400 with clear error |
| BE-TC-001.5 | Export uses version snapshot | Version content != current project content |
| BE-TC-001.6 | Export after project changes | Version export unchanged |
| BE-TC-001.7 | Export unauthorized version | Returns 401/403 |
| BE-TC-001.8 | Export ReqIFZ with valid version | Returns valid ZIP with .reqif inside |

---

## Implementation Phases

### Phase 1: CLI Implementation
1. Add `--format` option to `pull` command
2. Add validation logic for ReqIF version requirement
3. Implement ReqIF export path using legacy export endpoint
4. Add CLI unit tests

### Phase 2: Backend Implementation
1. Add version validation to `ExportProject.retrieve()`
2. Add validation error response
3. Add backend unit tests
4. Add integration tests

### Phase 3: Documentation
1. Update CLI README with format examples
2. Update API documentation
3. Add migration guide for existing users

---

## Acceptance Criteria

- [ ] CLI `pull --format reqif --version <version>` successfully exports ReqIF file
- [ ] CLI `pull --format reqifz --version <version>` successfully exports ReqIFZ file
- [ ] CLI `pull --format reqif` without version fails with clear error
- [ ] CLI `pull --format reqif --version main` fails with clear error
- [ ] CLI `pull --format context --version main` still works (not broken)
- [ ] Backend rejects ReqIF export without version with 400 error
- [ ] Backend rejects ReqIF export from MAIN with 400 error
- [ ] Backend exports use version snapshot, not current project state
- [ ] All CLI tests pass
- [ ] All backend tests pass
- [ ] Documentation updated

---

## Dependencies

- Existing backend `ExportProject` viewset (`apiviews_auxiliary_export.py`)
- Existing `ReqIFFormatter` in `backend/services/exporters/formatters/reqif.py`
- CLI `pull` command infrastructure

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking change for existing ReqIF export users | Low | High | Grace period + clear migration docs |
| CLI validation bypass | Medium | Medium | Backend also validates |
| Version lookup performance | Low | Low | Existing version query is indexed |
| User confusion about version requirement | Medium | Low | Clear error messages + examples |

---

## References

- Backend export endpoint: `backend/api/apiviews_auxiliary_export.py`
- ReqIF formatter: `backend/services/exporters/formatters/reqif.py`
- CLI pull command: `src/commands/context/pull.ts`
- Context API client: `src/api/contextApiClient.ts`
