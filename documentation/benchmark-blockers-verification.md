# Overnight CLI blockers: local evidence

## Plan and scope

V-cycle: plan → implement → verification. Level 3 because the existing refresh
can destroy local exports. Criteria: B1 reaches the fixture API with both flag
syntaxes; real output files and one JSON value; nonzero invalid/missing input;
destination-filesystem staging; old checksums survive download, extraction,
manifest-validation and promotion errors; interrupted promotion is recoverable;
Markdown no-overwrite remains the default. The initial scope excluded release actions. The subsequent user instruction,
"then release when ready", authorizes committing, pushing and tagging the verified
CLI release; production API testing and unrelated deployment remain excluded.

Design: scope Commander root options positionally, preserve trailing global
options and legacy baseline aliases. Extract and validate on destination device;
serialize cooperating promoters with a lock; rename old export to a retained
backup, promote, restore on error. This is a multi-step swap, not atomic. Recovery
and residual durability/concurrency limits are in [refresh-recovery.md](refresh-recovery.md).

## Baselines

- CLI HEAD: `ae7d8a60a036cb1dd77b7fa21cb51c007350f9df` (clean before edits).
- Existing `v0.1.1`: `2b051ff84ce6cfc48e4087ec7545a0117d3bd73d`, unchanged.
- The initial fixes were verified as an uncommitted patch on that baseline.
  Release candidate `0.1.2` now has exact implementation commit
  `038aafefe0b105d131eff4137f53074b7d9cd638`. Release readiness is recorded below. A later documentation-only commit may
  contain this same frozen executable implementation and the verification report.
- Environment: Linux, Node `v24.18.0`; local fixture HTTP API with synthetic PAT,
  isolated config, subprocess stdin closed. `/tmp` and `/dev/shm` are different
  devices. No production endpoint is used.

## Before evidence

An isolated archive of HEAD was compiled using the installed lockfile dependencies:

```sh
mkdir -p /tmp/ellygent-before-build
git archive HEAD | tar -x -C /tmp/ellygent-before-build
ln -s /home/aperico/workspace/ellygent-cli/node_modules /tmp/ellygent-before-build/node_modules
./node_modules/.bin/tsc -p /tmp/ellygent-before-build/tsconfig.json
node /tmp/ellygent-before-build/dist/index.js context pull --version B1 --json
EXPECTED_CLI_VERSION=0.1.1 CLI_ENTRY=/tmp/ellygent-before-build/dist/index.js REGRESSION_CASE=named node scripts/executable-regressions.mjs
EXPECTED_CLI_VERSION=0.1.1 CLI_ENTRY=/tmp/ellygent-before-build/dist/index.js REGRESSION_CASE=refresh-before REQUIRE_CROSS_FS=1 node scripts/executable-regressions.mjs
```

- Spaced pull: exit 0, stdout `0.1.1`, no export execution.
- Named regression: FAIL parsing stdout `0.1.1` as a single JSON result.
- Refresh regression uses the equals syntax to bypass the first bug: FAIL with
  `EXDEV` renaming from `/dev/shm/.../extract/.ellygent` into `/tmp/.../.ellygent`.
  Prior `old.bin` SHA-256 was
  `3d1f57c984978ef98a18378c8166c1cb8ede02c03eeb6aee7e2f121dfeee3e56`;
  after failure the old target was missing (`ENOENT`).

## After evidence

Run from `ellygent-cli` unless otherwise specified:

| Command | Result |
| --- | --- |
| `npm ci` | PASS; lockfile unchanged; prepare builds TypeScript |
| `npm run build` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS: 12 files, 132 tests |
| `REGRESSION_CASE=named npm run test:executable` | PASS |
| `REQUIRE_CROSS_FS=1 REGRESSION_CASE=refresh npm run test:executable` | PASS; real two-device refresh |
| `REQUIRE_CROSS_FS=1 npm run test:executable` | PASS (combined run) |
| `node dist/index.js context pull --help` | PASS; export flags/examples checked |
| `node dist/index.js auth login --help` | PASS; noninteractive flags checked |
| `node dist/index.js --help` | PASS; global flags checked |
| `git diff --check` (both repos) | PASS |
| `npm run typecheck` in `ellygent-frontend` | PASS |

Executable assertions cover inspect/pull and legacy contents/sync, both baseline
syntaxes, B1 contents/manifest, ReqIF/ReqIFZ download artifact bytes, JSON parsing
of all stdout, top-level version, missing/empty/invalid baseline, missing project,
missing ReqIF output or saved baseline, and Markdown preservation without overwrite.
Refresh assertions compare recursive per-file SHA-256 snapshots after download,
ZIP extraction, manifest and promotion failures. Deterministic rename injection
uses a Node preload, not a production environment hook. Also tested: rollback
failure retains the complete backup; a subsequent retry restores it; interrupted
lock blocks access until explicitly cleared; recovery restores the backup before
a later validation error. Successful refresh installs B1's manifest and summary.
The two-filesystem assertion requires differing device IDs, not path names alone.

## CI and docs

Existing release workflow now verifies PRs, main pushes and release invocations
with `npm ci`, typecheck, build, full suite and the executable regressions.
`REQUIRE_CROSS_FS=1` makes unavailable real cross-device coverage fail on Linux.
Publication depends on the verification job and runs only for tags/manual release
invocations. Checks run without production secrets. Required branch protection
has not been configured remotely. Hosted workflow execution is NOT RUN.

Quickstart/README and public installation, getting-started, authentication,
automation and command docs were audited. Changes correct lockfile installation,
Node >=20 examples, manifest filenames, version short flag, ReqIF command paths,
Markdown selection, JSON flag guidance and provenance of the old tag. Public
ReqIF examples already use `context pull`, saved version and `--out`; executable
fixture checks exercise those flags. Installer scripts and production CI examples
were not executed.

## Independent verification and remaining gaps

Native workers initially had no execution tools. Separate installed Codex CLI
sessions were therefore used for independent verification. The first workspace
sandbox could not bind loopback or write the default npm cache, and was not counted
as passing the required executable suites. It did identify an output-format
regression and a weak Markdown preservation assertion. Both were corrected:
explicit nearest-command options now override ancestor defaults; the Markdown
check asserts the no-overwrite error and has a valid successful overwrite control.
Listener startup now reports the actual error and removes its temporary root.

An independent session using the host's existing unrestricted permission profile
reran both required suites successfully, with distinct device IDs 27 (`/dev/shm`)
and 50 (`/tmp`). It independently injected an actual SIGKILL just after backup
rename and verified retained lock/backup and checksum recovery on retry.
The final independent rerun of the frozen implementation ref above returned
**PASS with no release-blocking findings**. The exact commands and results are in
[independent release verification](independent-release-verification.md). No production systems are used.

Windows/macOS, local Node 20 execution, hosted CI, power-loss durability, real
production authentication, live export and first-time user usability: **NOT TESTED**.
The regression suite constructs interrupted state deterministically; the separate
independent verifier also exercised actual SIGKILL after backup rename. Power
failure was not exercised. ReqIF payloads are synthetic transport fixtures,
not a production backend compatibility or XML schema validation claim.
`npm ci` reported 20 dependency advisories (3 low, 6 moderate, 7 high, 4 critical);
no dependency upgrades were made in this bounded correction.
