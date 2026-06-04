# CLI Distribution Architecture

This document describes the complete distribution pipeline for the Ellygent CLI, from build to end-user installation.

## Table of Contents

1. [Overview](#overview)
2. [Distribution Channels](#distribution-channels)
3. [Build Pipeline](#build-pipeline)
4. [Frontend Integration](#frontend-integration)
5. [Installation Methods](#installation-methods)
6. [Release Workflow](#release-workflow)
7. [Security & Verification](#security--verification)
8. [Maintenance](#maintenance)

## Overview

The Ellygent CLI uses a multi-channel distribution strategy to maximize accessibility while maintaining security and reliability:

- **Direct binary downloads** - Self-contained executables
- **Installer scripts** - Automated installation with verification
- **Development npm workflow** - For contributor or future npm distribution
- **Package managers** - Future: Homebrew, Chocolatey, apt, yum

## Distribution Channels

### 1. Direct Binary Downloads

Standalone, self-contained executables requiring no runtime dependencies.

**Platforms:**
- Windows x64 (`.exe`)
- Linux x64 (ELF binary)
- macOS x64 / Intel (Mach-O binary)
- macOS ARM64 / Apple Silicon (Mach-O binary)

**Naming Convention:**
```
ellygent-{platform}-{arch}[.ext]

Examples:
  ellygent-win-x64.exe
  ellygent-linux-x64
  ellygent-macos-x64
  ellygent-macos-arm64
```

**Distribution:**
- Hosted: `https://ellygent.com/downloads/cli/latest/`
- Versioned: `https://ellygent.com/downloads/cli/v{version}/`
- GitHub Releases: Attached as release artifacts

### 2. Archives

Platform-appropriate compressed archives for distribution and integrity.

**Format:**
- Windows: `.zip`
- Linux/macOS: `.tar.gz`

**Naming Convention:**
```
ellygent-v{version}-{platform}-{arch}.{ext}

Examples:
  ellygent-v0.1.0-windows-x64.zip
  ellygent-v0.1.0-linux-x64.tar.gz
  ellygent-v0.1.0-macos-x64.tar.gz
  ellygent-v0.1.0-macos-arm64.tar.gz
```

### 3. Installer Scripts

Automated installation with platform detection and checksum verification.

**Linux/macOS (`install.sh`):**
```bash
curl -fsSL https://ellygent.com/cli/install.sh | sh
```

Features:
- Automatic platform/arch detection
- curl/wget fallback
- SHA256 verification (optional, based on availability)
- Automatic PATH configuration
- sudo elevation when needed

**Windows (`install.ps1`):**
```powershell
irm https://ellygent.com/cli/install.ps1 | iex
```

Features:
- Architecture detection (x64/ARM64)
- SHA256 verification
- Automatic PATH addition
- User-scoped installation (no admin required)

### 4. Development Installation from GitHub

Use this only for contributors or when you need a Node-based local install from the repository itself.

```bash
npm install -g https://github.com/EEQuality/ellygent-cli
```

**Status:** Not published to the npm registry yet  
**Registry package:** `@ellygent/cli`  
**Requires:** Node.js >= 20.0.0

## Build Pipeline

### Architecture

```
Source Code (TypeScript)
    ↓
TypeScript Compiler (tsc)
    ↓
JavaScript (ESM modules)
    ↓
pkg (binary compiler)
    ↓
Standalone Binaries (4 platforms)
    ↓
Archive Creation (.zip/.tar.gz)
    ↓
Checksum Generation (SHA256)
    ↓
Metadata Generation (version.json)
    ↓
Frontend Publishing
    ↓
GitHub Release Creation
```

### Build Scripts

Located in `scripts/`:

| Script | Purpose |
|--------|---------|
| `build-binaries.js` | Compile standalone binaries using pkg |
| `create-archives.js` | Package binaries into platform-specific archives |
| `generate-checksums.js` | Generate SHA256 checksums for verification |
| `generate-version-metadata.js` | Create version.json for frontend |
| `publish-to-frontend.js` | Copy artifacts to frontend repo |
| `install.sh` | Unix installer script |
| `install.ps1` | Windows installer script |

### Platform-Aware Building

**Local Development:**
By default, `build-binaries.js` only builds binaries for your current platform to avoid cross-compilation issues:

- **Windows**: Only builds `ellygent-win-x64.exe`
- **Linux**: Only builds `ellygent-linux-x64`
- **macOS**: Builds both `ellygent-macos-x64` and `ellygent-macos-arm64`

This is because the underlying `pkg` tool cannot reliably cross-compile to all platforms. Attempting to build macOS binaries on Windows or Linux will fail with spawn errors.

**CI/CD (GitHub Actions):**
When running in CI (detected via `CI=true` or `GITHUB_ACTIONS=true` environment variables), the build uses a **matrix strategy** with platform-specific runners:

- `windows-latest` runner builds Windows binaries
- `ubuntu-latest` runner builds Linux binaries
- `macos-latest` runner builds both macOS binaries (Intel + Apple Silicon)

The workflow then combines all artifacts before creating archives and publishing.

**Manual Full Build:**
To test the full multi-platform build locally (if you have access to multiple platforms), set the CI flag:

```bash
CI=true npm run build:binaries
```

⚠️ This will still fail for platforms you cannot natively build on.

### npm Scripts

```json
{
  "build": "tsc -p tsconfig.json",
  "build:binaries": "node scripts/build-binaries.js",
  "build:archives": "node scripts/create-archives.js",
  "build:checksums": "node scripts/generate-checksums.js",
  "build:metadata": "node scripts/generate-version-metadata.js",
  "build:release": "npm run build && npm run build:binaries && npm run build:archives && npm run build:checksums && npm run build:metadata",
  "publish:frontend": "node scripts/publish-to-frontend.js"
}
```

### Artifacts

All build artifacts are generated in `dist/`:

```
dist/
  bin/                           # Standalone binaries
    ellygent-win-x64.exe
    ellygent-linux-x64
    ellygent-macos-x64
    ellygent-macos-arm64
  archives/                      # Compressed archives
    ellygent-v0.1.0-windows-x64.zip
    ellygent-v0.1.0-linux-x64.tar.gz
    ellygent-v0.1.0-macos-x64.tar.gz
    ellygent-v0.1.0-macos-arm64.tar.gz
    checksums.txt                # SHA256 checksums
    checksums.json               # Machine-readable checksums
    version.json                 # Frontend metadata
```

## Frontend Integration

### Directory Structure

```
ellygent-frontend/public/
  downloads/cli/
    latest/                      # Symlink/copy of current release
      ellygent-win-x64.exe
      ellygent-linux-x64
      ellygent-macos-x64
      ellygent-macos-arm64
      ellygent-v0.1.0-windows-x64.zip
      ellygent-v0.1.0-linux-x64.tar.gz
      ellygent-v0.1.0-macos-x64.tar.gz
      ellygent-v0.1.0-macos-arm64.tar.gz
      checksums.txt
      checksums.json
      version.json
    v0.1.0/                      # Versioned archive
      ...
  cli/
    install.sh                   # Installer endpoint
    install.ps1                  # Installer endpoint
```

### version.json Schema

```json
{
  "version": "0.1.0",
  "releaseDate": "2026-05-23",
  "downloads": {
    "windows": {
      "url": "/downloads/cli/latest/ellygent-v0.1.0-windows-x64.zip",
      "binary": "/downloads/cli/latest/ellygent-win-x64.exe",
      "checksum": "abc123...",
      "platform": "windows",
      "arch": "x64"
    },
    "linux": { ... },
    "macosIntel": { ... },
    "macosAppleSilicon": { ... }
  },
  "npm": {
    "package": "@ellygent/cli",
    "version": "0.1.0",
    "install": "npm install -g https://github.com/EEQuality/ellygent-cli"
  },
  "checksumAlgorithm": "sha256"
}
```

### Frontend Components

- **CLIDownloads** (`components/cli/CLIDownloads.tsx`)  
  Platform detection, recommended downloads, checksum display

- **CLI Page** (`pages/cli.tsx`)  
  Landing page with installation methods and examples

## Installation Methods

### For End Users

1. **Quick Install (Recommended)**
   ```bash
   # Linux/macOS
   curl -fsSL https://ellygent.com/cli/install.sh | sh
   
   # Windows
   irm https://ellygent.com/cli/install.ps1 | iex
   ```

2. **Direct Download**
   - Visit https://ellygent.com/cli
   - Platform auto-detected
   - One-click download

3. **Manual Installation**
   - Download binary or archive
   - Extract (if archive)
   - Move to PATH
   - Make executable (Unix)

4. **Development installation from GitHub**
   ```bash
   npm install -g https://github.com/EEQuality/ellygent-cli
   ```

   This installs directly from GitHub and does not depend on the public npm registry. The npm registry package is future-only until `@ellygent/cli` is published.

### For CI/CD

```yaml
# GitHub Actions example
- name: Install Ellygent CLI
  run: curl -fsSL https://ellygent.com/cli/install.sh | sh

- name: Use CLI
  run: |
    ellygent login --api-url $API_URL --token ${{ secrets.ELLYGENT_TOKEN }}
    ellygent sync --project $PROJECT_ID --version $VERSION
```

## Release Workflow

### Automated (Recommended)

1. Update version: `npm version patch`
2. Update CHANGELOG.md
3. Commit and push
4. Create tag: `git tag v0.1.1 && git push origin v0.1.1`
5. GitHub Actions automatically:
   - Builds binaries
   - Creates archives
   - Generates checksums
   - Publishes to frontend
   - Creates GitHub Release

### Manual (Emergency/Testing)

```bash
# Build everything
npm run build:release

# Publish to frontend
npm run publish:frontend

# Manually create GitHub Release
gh release create v0.1.1 \
  --title "Ellygent CLI v0.1.1" \
  --notes "..." \
  dist/archives/*
```

## Security & Verification

### Checksums

All release artifacts include SHA256 checksums:

```
# checksums.txt format
abc123...  ellygent-v0.1.0-windows-x64.zip
def456...  ellygent-v0.1.0-linux-x64.tar.gz
...
```

**Verification:**

Linux/macOS:
```bash
sha256sum -c checksums.txt
```

Windows:
```powershell
$hash = (Get-FileHash .\ellygent-win-x64.exe).Hash
$hash -eq "abc123..."
```

### Installer Script Verification

Both installer scripts verify checksums automatically when `sha256sum` or `Get-FileHash` are available.

### Future: Code Signing

Planned additions:
- Windows: Authenticode signing
- macOS: Developer ID signing and notarization
- Linux: GPG signatures
- SLSA provenance attestation

## Maintenance

### Updating Binaries

When releasing a new version:

1. Version number auto-updated by `npm version`
2. Build scripts read from package.json
3. Artifacts auto-named with version
4. Frontend `/latest/` updated automatically
5. Versioned archive created for rollback

### Rollback Procedure

To rollback to a previous version:

```bash
# In frontend repo
cd public/downloads/cli/
rm -rf latest
cp -r v0.1.0 latest
git commit -am "Rollback CLI to v0.1.0"
git push
```

### Monitoring

Track download metrics:
- Frontend access logs
- GitHub Release download counts
- npm download statistics

### Support Matrix

| Platform | Architecture | Support Level |
|----------|--------------|---------------|
| Windows | x64 | ✅ Full |
| Windows | ARM64 | 🔄 Future |
| Linux | x64 | ✅ Full |
| Linux | ARM64 | 🔄 Future |
| macOS | x64 (Intel) | ✅ Full |
| macOS | ARM64 (Apple Silicon) | ✅ Full |

---

**Version:** 1.0  
**Last Updated:** 2026-05-23  
**Maintained by:** Ellygent Engineering
