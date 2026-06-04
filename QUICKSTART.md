# Quick Start Guide - GitHub npm Distribution

## For Release Managers

### Creating a New Release

1. Run validation locally.

```bash
cd ellygent-cli
npm install
npm test
npm run build
npm pack --dry-run
```

2. Bump the version.

```bash
npm version patch
```

3. Update the changelog and push the tag.

```bash
git push origin main
git push origin v0.1.1
```

4. Monitor the release workflow.

- It builds the CLI.
- It packs the npm tarball for verification.
- It republishes the hosted installer scripts.
- It creates a GitHub Release with the GitHub npm install command.

## For Developers

### Local verification

```bash
cd ellygent-cli
npm install
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
# Direct install from GitHub
npm install -g git+https://github.com/EEQuality/ellygent-cli.git

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
- Packed npm tarball
- Updated frontend `public/cli/` installer scripts
- GitHub Release notes pointing to GitHub npm installation

## For End Users

### Install the CLI

```bash
npm install -g git+https://github.com/EEQuality/ellygent-cli.git
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

**Install directly from GitHub with npm:**
```bash
npm install -g git+https://github.com/EEQuality/ellygent-cli.git
```

This GitHub-based workflow is the official distribution path. It installs directly from the repository and does not rely on the public npm registry.

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

# Download context
ellygent sync --project project-id --version v1.0

# Help
ellygent --help
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Build locally | `npm run build:release` |
| Publish to frontend | `npm run publish:frontend` |
| Create release | Tag and push: `git tag v0.1.1 && git push origin v0.1.1` |
| Install (Unix) | `curl -fsSL https://ellygent.com/cli/install.sh \| sh` |
| Install (Windows) | `irm https://ellygent.com/cli/install.ps1 \| iex` |
| Install (npm) | `npm install -g git+https://github.com/EEQuality/ellygent-cli.git` |
| Verify install | `ellygent --version` |
| View install docs | https://ellygent.com/cli |
| View releases | https://github.com/EEQuality/ellygent-cli/releases |

---

**Last Updated:** 2026-06-04  
**Pipeline Version:** GitHub npm only
