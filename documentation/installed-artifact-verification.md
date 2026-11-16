# Installed-artifact release gate

Scope: additive packaging/CI and installer documentation; application source is
unchanged from v0.1.2. The publication job already depended on `verify` for every
trigger. This update adds `npm run test:installed` to that required job, with
`REQUIRE_CROSS_FS=1`, so a bad packed/installed executable blocks publication.

The smoke packs built code without lifecycle hooks, installs into a temporary
prefix without install hooks, checks all 47 JavaScript files by SHA-256, then
executes the installed copy against the local synthetic fixture API. It asserts
baseline identity, output files, whole stdout JSON, invalid input failures and
refresh rollback/recovery; it is not a version-string-only check.

Local checks passed: `npm run build`, `REQUIRE_CROSS_FS=1 npm run test:installed`,
`npm run typecheck`, `npm test` (132 tests), frontend `npm run typecheck`, shell
syntax and both repositories' `git diff --check`. Concurrent baseline-test commit
`d297df5` was preserved. No new runtime release/tag or frontend deployment is
required for this additive CI/documentation change.

Independent verification (separate installed Codex CLI session, host permissions,
synthetic fixtures only):

PASS for the current additive CI/installer scope. No blockers found.

| Required command | Result |
|---|---|
| `npm run build` | PASS, exit 0 |
| `REQUIRE_CROSS_FS=1 npm run test:installed` | PASS, exit 0 |
| `npm run typecheck` | PASS, exit 0 |

Verified:

- Publication has `needs: verify`; verification applies to PR, main, tag and manual triggers. It includes installed smoke with cross-filesystem verification required.
- The packed CLI installs into an isolated temporary prefix. All **47 built JavaScript files** matched their installed counterparts by SHA-256.
- Fixtures execute the installed `dist/index.js`, asserting B1 selection, exported files, single JSON stdout, invalid/missing input, refresh checksum preservation, rollback/recovery and real cross-filesystem success using `/dev/shm`.
- `curl … | VERSION=v0.1.2 sh` correctly passes `VERSION` to the installer process; a synthetic pipeline confirmed this. `sh -n scripts/install.sh` passed.
- Generated release notes use detached checkout of `${{ github.sha }}` and assert the resulting HEAD.
- `src` is unchanged from local `v0.1.2` (`7abd4812382245c0eaa98eb6b0c17542478e07d0`).

Nonblocking limitations: manual publication requires dispatching against the matching version tag; dispatching against a branch fails the existing identity check. Hash comparison checks every built JS file but does not reject additional installed files.

Read and followed framework verification instructions. No files edited, delegation, commits, pushes, releases, deployments or production access. GitHub Actions itself and live installer downloads were not run.