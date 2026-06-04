# Quick Start Guide - CLI Distribution Pipeline

## For Release Managers

### Creating a New Release

**1. Pre-release checks:**
```bash
cd ellygent-cli

# Run tests
npm test

# Verify build
npm run build

# Optional: Test local binary build (takes ~5 min)
npm run build:binaries
```

**2. Version bump:**
```bash
# Patch: 0.1.0 → 0.1.1
npm version patch

# Minor: 0.1.0 → 0.2.0
npm version minor

# Major: 0.1.0 → 1.0.0
npm version major
```

**3. Update CHANGELOG.md:**
- Move `[Unreleased]` items to new version section
- Add release date
- Commit: `git commit -am "Update CHANGELOG for v0.1.1"`

**4. Push and tag:**
```bash
git push origin main
git tag v0.1.1
git push origin v0.1.1
```

**5. Monitor automation:**
- Check GitHub Actions: https://github.com/EEQuality/ellygent-cli/actions
- Verify GitHub Release created
- Verify frontend repo updated
- Test install from https://ellygent.com/cli

**Done!** Users can now install v0.1.1

---

## For Developers

### Testing Build Pipeline Locally

**Build everything:**
```bash
cd ellygent-cli
npm install
npm run build:release
```

**Artifacts created:**
```
dist/bin/
  ellygent-win-x64.exe
  ellygent-linux-x64
  ellygent-macos-x64
  ellygent-macos-arm64

dist/archives/
  ellygent-v0.1.0-windows-x64.zip
  ellygent-v0.1.0-linux-x64.tar.gz
  ellygent-v0.1.0-macos-x64.tar.gz
  ellygent-v0.1.0-macos-arm64.tar.gz
  checksums.txt
  checksums.json
  version.json
```

**Publish to frontend (local test):**
```bash
npm run publish:frontend
```

**Verify:**
```bash
cd ../ellygent-frontend
ls -la public/downloads/cli/latest/
ls -la public/cli/
```

### Testing Frontend Download UI

**1. Start frontend dev server:**
```bash
cd ellygent-frontend
npm run dev
```

**2. Visit:** http://localhost:3000/cli

**3. Verify:**
- Download section renders
- Platform detected correctly
- Download buttons work (if artifacts exist)
- Checksums display
- Installation instructions expand

### Testing Installer Scripts

**Unix (Linux/macOS):**
```bash
# Local test
chmod +x scripts/install.sh
./scripts/install.sh

# Production test
curl -fsSL https://ellygent.com/cli/install.sh | sh
```

**Windows (PowerShell):**
```powershell
# Local test
.\scripts\install.ps1

# Production test
irm https://ellygent.com/cli/install.ps1 | iex
```

### Manual Binary Test

**Build and run:**
```bash
# Build
npm run build
npm run build:binaries

# Test (platform-specific)
./dist/bin/ellygent-linux-x64 --version
./dist/bin/ellygent-macos-x64 --version
./dist/bin/ellygent-win-x64.exe --version
```

---

## For DevOps

### CI/CD Pipeline

**Workflow:** `.github/workflows/release.yml`

**Triggers:**
- Git tag push: `v*.*.*`
- Manual: workflow_dispatch with version input

**Steps:**
1. Checkout ellygent-cli
2. Checkout ellygent-frontend
3. Install Node.js 20
4. Install dependencies
5. Build TypeScript
6. Compile binaries (4 platforms)
7. Create archives
8. Generate checksums
9. Generate metadata
10. Publish to frontend repo
11. Create GitHub Release
12. Commit frontend changes

**Secrets needed:**
- `GITHUB_TOKEN` (auto-provided)

**Monitoring:**
- GitHub Actions: https://github.com/EEQuality/ellygent-cli/actions
- Check release: https://github.com/EEQuality/ellygent-cli/releases
- Check frontend commit: https://github.com/EEQuality/ellygent-frontend/commits/main

### Troubleshooting

**Build fails:**
```bash
# Check logs in GitHub Actions
# Or run locally:
cd ellygent-cli
npm run build:release
```

**Frontend publish fails:**
```bash
# Verify frontend repo exists at ../ellygent-frontend
# Or set custom path in publish-to-frontend.js
```

**GitHub Release not created:**
- Check GITHUB_TOKEN permissions
- Verify tag format: `v*.*.*`
- Check workflow file syntax

**Rollback release:**
```bash
# In frontend repo
cd public/downloads/cli/
rm -rf latest
cp -r v0.1.0 latest  # or whichever version
git commit -am "Rollback CLI to v0.1.0"
git push origin main
```

---

## For End Users

### Installation

**Recommended (one command):**

Linux/macOS:
```bash
curl -fsSL https://ellygent.com/cli/install.sh | sh
```

Windows (PowerShell):
```powershell
irm https://ellygent.com/cli/install.ps1 | iex
```

**Development installation from GitHub:**
```bash
npm install -g https://github.com/EEQuality/ellygent-cli
```

This GitHub-based workflow is for contributors and local development. It installs directly from the repository and does not rely on the public npm registry.

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
| Install (dev) | `npm install -g https://github.com/EEQuality/ellygent-cli` |
| Test binary | `./dist/bin/ellygent-* --version` |
| Verify install | `ellygent --version` |
| View install docs | https://ellygent.com/cli |
| View releases | https://github.com/EEQuality/ellygent-cli/releases |

---

**Last Updated:** 2026-05-23  
**Pipeline Version:** 1.0
