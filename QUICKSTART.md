# Quick Start Guide - GitHub npm Distribution

## For Release Managers

### Creating a New Release

1. Run validation locally.

```bash
cd ellygent-cli
npm ci
npm test
npm run build
npm pack --dry-run
```

2. Bump the version.

```bash
npm version patch --no-git-tag-version
```

3. Update the changelog and push the tag.

```bash
git push origin main
git push origin v0.1.2
```

4. Monitor the release workflow.

- It builds the CLI.
- It republishes the hosted installer scripts.
- It creates a GitHub Release with GitHub checkout installation instructions.

## For Developers

### Local verification

```bash
cd ellygent-cli
npm ci
npm run build:release
npm pack
```

### Publish installer scripts to the frontend repo

```bash
npm run publish:frontend
```

Verify:

```bash
cd ../ellygent-frontend
ls -la public/cli/
```

### Test installation flows

```bash
# Direct install from GitHub source
git clone --depth 1 https://github.com/EEQuality/ellygent-cli.git
cd ellygent-cli
npm ci
npm run build
npm install -g .

# Hosted installer wrappers
curl -fsSL https://ellygent.com/cli/install.sh | sh
irm https://ellygent.com/cli/install.ps1 | iex
```

## For DevOps

### Release workflow

Workflow: `.github/workflows/release.yml`

Triggers:
- Git tag push: `v*.*.*`
- Manual: `workflow_dispatch`

Key outputs:
- Built `dist/` JavaScript bundle
- Updated frontend `public/cli/` installer scripts
- GitHub Release notes pointing to GitHub checkout installation

## For End Users

### Install the CLI

```bash
git clone --depth 1 https://github.com/EEQuality/ellygent-cli.git
cd ellygent-cli
npm ci
npm run build
npm install -g .
```

Optional wrappers:

```bash
curl -fsSL https://ellygent.com/cli/install.sh | sh
```

```powershell
irm https://ellygent.com/cli/install.ps1 | iex
```

### Verify installation

```bash
ellygent --version
ellygent --help
ellygent auth login --token <your-personal-access-token>
ellygent whoami
```

**Recommended (one command):**

Linux/macOS:
```bash
curl -fsSL https://ellygent.com/cli/install.sh | sh
```

Windows (PowerShell):
```powershell
irm https://ellygent.com/cli/install.ps1 | iex
```

**Install directly from GitHub:**
```bash
git clone --depth 1 https://github.com/EEQuality/ellygent-cli.git
cd ellygent-cli
npm ci
npm run build
npm install -g .
```

This GitHub-based workflow is the official distribution path. It installs directly from checked-out GitHub source and does not rely on the public npm registry.

### Verification

**Check version:**
```bash
ellygent --version
```

### Usage

```bash
# Login
ellygent auth login --token <your-personal-access-token>

# Check authentication status
ellygent whoami

# List projects
ellygent projects --org my-org

# Inspect a saved baseline (replace demo and B1 with your identifiers)
ellygent context inspect --project demo --version B1 --json

# Download that baseline
ellygent context pull --project demo --version B1 --workspace ./engineering-context --json

# Equivalent spelling; run in a separate workspace or refresh the same export
ellygent context pull --project demo --version=B1 --workspace ./engineering-context --json

# Help
ellygent --help
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Build locally | `npm run build:release` |
| Publish to frontend | `npm run publish:frontend` |
| Create release | Tag and push: `git tag v0.1.2 && git push origin v0.1.2` |
| Install (Unix) | `curl -fsSL https://ellygent.com/cli/install.sh \| sh` |
| Install (Windows) | `irm https://ellygent.com/cli/install.ps1 \| iex` |
| Install (GitHub) | `git clone --depth 1 https://github.com/EEQuality/ellygent-cli.git && cd ellygent-cli && npm ci && npm run build && npm install -g .` |
| Verify install | `ellygent --version` |
| View install docs | https://ellygent.com/cli |
| View releases | https://github.com/EEQuality/ellygent-cli/releases |

---

**Last Updated:** 2026-06-04  
**Pipeline Version:** GitHub checkout only


## Build provenance and local validation

The overnight benchmark used `ae7d8a60a036cb1dd77b7fa21cb51c007350f9df`
(reports `0.1.1`). The existing `v0.1.1` tag is the older
`2b051ff84ce6cfc48e4087ec7545a0117d3bd73d`; it does not identify that build.
The fixes are in CLI `0.1.2`. The exact implementation ref is
`038aafefe0b105d131eff4137f53074b7d9cd638`. The release tag must point to a commit
containing this implementation; `v0.1.1` remains unchanged.

To reproduce the validated implementation independently of a mutable branch:

```sh
git clone https://github.com/EEQuality/ellygent-cli.git
cd ellygent-cli
git checkout --detach 038aafefe0b105d131eff4137f53074b7d9cd638
```

```sh
npm ci
npm run typecheck
npm run build
npm test
REQUIRE_CROSS_FS=1 npm run test:executable # Linux with /dev/shm on another device
```

The executable regression uses a loopback API and synthetic credentials, checks
both `--version B1` and `--version=B1`, parses the entire stdout as one JSON
result, and asserts files and baseline identity. Use `--json` for automation;
`context pull --format` selects the export format. ReqIF/ReqIFZ require a saved
baseline and `--out`. See [refresh recovery](documentation/refresh-recovery.md).
Production authentication, live export, and first-time user usability: **not tested**.
