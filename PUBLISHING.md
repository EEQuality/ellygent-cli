# CLI release process

The CLI is distributed from GitHub source and version tags. This repository does
not publish to npm. Do not reuse or move an existing tag: `v0.1.1` identifies the
older `2b051ff` build, not the overnight benchmark at `ae7d8a6`.

## Prepare and verify

Use Node.js 20 or newer and the checked-in lockfile. Version changes must update
`package.json` and `package-lock.json`; the executable reads package metadata so
its version cannot drift independently.

```sh
npm version patch --no-git-tag-version
npm ci
npm run typecheck
npm run build
npm test
REGRESSION_CASE=named npm run test:executable
REQUIRE_CROSS_FS=1 REGRESSION_CASE=refresh npm run test:executable
npm pack --dry-run
```

The executable checks use a loopback fixture API, synthetic credentials, closed
stdin and isolated configuration. Linux release validation requires `/dev/shm`
on a different device from the workspace. Failure injection remains mandatory
alongside that real cross-filesystem check. Independent verification must rerun
both regressions and review rollback/recovery. Record untested platforms and
production flows explicitly; do not test production as a release check.

Update CHANGELOG and exact-ref documentation before committing. Push the reviewed
commit, wait for its main-branch verification job to pass, then tag that exact
commit. For this correction, the intended new version is `0.1.2`.

```sh
git push origin main
# Inspect the verification run for the exact commit and wait for success.
git tag -a v0.1.2 -m "Ellygent CLI 0.1.2"
git push origin v0.1.2
```

These commands require release authorization; they are not part of local tests.

## Automated gates and publication

`.github/workflows/release.yml` runs on pull requests, main pushes and version
tags. `verify` installs from the lockfile, typechecks, builds, runs the full suite
and runs both executable regressions with real cross-filesystem coverage required.
The publication job depends on this gate. Configure branch protection separately
if merges must also require the verification status.

For a version tag, publication validates that the tag and any manually supplied
version match package metadata and the executable. It generates installer assets
in a temporary local directory; it does not check out or deploy the private
frontend. Missing/empty installers, inconsistent summary metadata and unmatched
release assets fail the job. Installer scripts and the summary are uploaded as a
workflow artifact and attached to the GitHub release.

A manual dispatch must select the existing matching tag and supply its version;
it cannot publish a branch checkout under another version. After publication,
verify the release URL, tag commit, job conclusion and three attached assets.
Public frontend documentation and installer hosting remain a separate deployment;
CLI publication does not authorize unrelated frontend changes.

## Exact installation

```sh
git clone --depth 1 --branch v0.1.2 https://github.com/EEQuality/ellygent-cli.git
cd ellygent-cli
npm ci
npm run build
node dist/index.js --version
npm install -g .
```

For stronger reproducibility, use the full fixed commit recorded in README and
compare `git rev-parse HEAD` before building. A version string alone does not
identify which historical `0.1.1` build was used.

## Recovery and rollback

Context refresh uses a multi-step directory swap with retained backup and
rollback. See [refresh recovery](documentation/refresh-recovery.md).
A faulty public release should be superseded by a new patch release; do not move
published tags. Prefer a previously verified explicit ref while investigating.
No production authentication, live export, or first-time usability validation is
implied by local fixtures or GitHub Actions.


### Verify the installed artifact

For a tag, pass the version to the installer process:

```sh
curl -fsSL https://ellygent.com/cli/install.sh | VERSION=v0.1.2 sh
```

For an exact commit, use explicit Git checkout and check `git rev-parse HEAD`
(see the full verified SHA in README). On current main and subsequent releases
that contain the installed-artifact check, build that checkout and run:

```sh
npm run test:installed
```

This installs a packed artifact into an isolated temporary prefix, compares its
JavaScript with the built checkout by SHA-256, and runs the fixture regressions
against the installed executable. It verifies B1 selection, exported files,
single JSON stdout and refresh failure preservation. `--version` alone cannot
identify a build: both historical benchmark/tag builds reported `0.1.1`.
The release publication job depends on all verification, including this installed
artifact check, for tag pushes and manual dispatch as well as PR/main checks.
