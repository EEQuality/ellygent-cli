# Publishing Guide

This document describes the release and distribution process for the Ellygent CLI.

## Release Model

The CLI is distributed as a Node.js package installed from GitHub Release assets.

- Official install: `npm install -g https://github.com/EEQuality/ellygent-cli/releases/latest/download/ellygent-cli-latest.tgz`
- Versioned install: `npm install -g https://github.com/EEQuality/ellygent-cli/releases/download/v0.1.1/ellygent-cli-0.1.1.tgz`
- Frontend-hosted installer scripts remain available, but they only wrap the GitHub Release npm install flow.

## Distribution Architecture

```
ellygent-cli/
   scripts/
      publish-to-frontend.js       # Copy installer scripts to frontend repo
      install.sh                   # Unix installer wrapper for npm install
      install.ps1                  # Windows installer wrapper for npm install

ellygent-frontend/
   public/
      cli/
         install.sh
         install.ps1
         distribution-summary.json
```

## Automated Release Process

Releases are automated via GitHub Actions.

### Trigger a Release

1. **Update version in package.json**
   ```bash
   npm version patch  # 0.1.0 → 0.1.1
   npm version minor  # 0.1.0 → 0.2.0
   npm version major  # 0.1.0 → 1.0.0
   ```

2. **Update CHANGELOG.md**
   - Move unreleased changes to new version section
   - Add release date

3. **Commit and push version bump**
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "Release v0.1.1"
   git push origin main
   ```

4. **Create and push Git tag**
   ```bash
   git tag v0.1.1
   git push origin v0.1.1
   ```

5. **GitHub Actions automatically:**
   - Builds TypeScript to JavaScript
   - Packs the npm tarball for verification
   - Publishes installer scripts to the frontend public directory
   - Creates GitHub Release notes with the GitHub Release npm install command

### Manual Build (Local Testing)

Build the distributable npm package locally:

```bash
# Release build
npm run build:release

# Individual steps
npm run build              # TypeScript → JavaScript
npm pack                   # Verify published package contents

# Publish installer scripts to frontend (requires ../ellygent-frontend)
npm run publish:frontend
```

### Verify Release Artifacts

After build, verify:

```bash
ls -lh dist/
npm pack --dry-run
```

## npm Publishing

To publish to npm registry:

### Pre-Release Checklist

Before publishing a new version:

1. **Run tests and verify coverage**
   ```powershell
   npm test
   npm run test:coverage
   ```

2. **Run linter**
   ```powershell
   npm run lint
   ```

3. **Build and verify TypeScript compilation**
   ```powershell
   npm run build
   ```

4. **Test package contents**
   ```powershell
   npm pack --dry-run
   ```
   - Verify only dist/ and README.md are included
   - Confirm no test files, source files, or unnecessary artifacts

5. **Update version**
   - Follow [Semantic Versioning](https://semver.org/)
   - MAJOR: Breaking changes
   - MINOR: New features (backward compatible)
   - PATCH: Bug fixes (backward compatible)

   ```powershell
   # Patch: 0.1.0 → 0.1.1
   npm version patch

   # Minor: 0.1.0 → 0.2.0
   npm version minor

   # Major: 0.1.0 → 1.0.0
   npm version major
   ```

6. **Update CHANGELOG.md**
   - Move unreleased changes to new version section
   - Add release date
   - Summarize changes under Added/Changed/Fixed/Removed

## Publishing to npm

### First-time Setup

1. **Login to npm**
   ```powershell
   npm login
   ```

2. **Verify package name availability**
   ```powershell
   npm search @ellygent/cli
   ```

### Publishing

1. **Dry run to verify**
   ```powershell
   npm publish --dry-run
   ```

2. **Publish to npm**
   ```powershell
   npm publish --access public
   ```
   - For scoped packages (@ellygent/cli), add `--access public`
   - For private packages, use `--access restricted`

3. **Verify published package**
   ```powershell
   npm info @ellygent/cli
   ```

4. **Create Git tag**
   ```powershell
   git tag v0.1.0
   git push origin v0.1.0
   ```

5. **Create GitHub Release**
   - Go to GitHub releases page
   - Create new release from tag
   - Copy CHANGELOG.md content for release notes
   - Attach tarball if needed

## Installing During Development

Install from GitHub Release assets:

```powershell
# Install globally
npm install -g https://github.com/EEQuality/ellygent-cli/releases/latest/download/ellygent-cli-latest.tgz

# Install as dev dependency
npm install --save-dev https://github.com/EEQuality/ellygent-cli/releases/latest/download/ellygent-cli-latest.tgz

# Install from specific version
npm install -g https://github.com/EEQuality/ellygent-cli/releases/download/v0.1.0/ellygent-cli-0.1.0.tgz
```

## Unpublishing (Emergency Only)

If you need to unpublish a version within 72 hours:

```powershell
npm unpublish @ellygent/cli@0.1.0
```

**Warning:** Unpublishing is permanent and can break dependent projects. Only use in emergencies (e.g., leaked credentials).

## Version Strategy

- **0.x.x**: Development/beta versions
- **1.0.0**: First stable release
- **1.x.x**: Stable releases with backward compatibility

## CI/CD Integration (Future)

Consider automating releases:

1. GitHub Actions workflow triggered on version tags
2. Automated testing before publish
3. Automated changelog generation
4. Automated npm publish with token

Example workflow trigger:
```yaml
on:
  push:
    tags:
      - 'v*'
```

## Package Quality Checks

Before publishing, verify:

- [ ] All tests passing
- [ ] Lint errors resolved
- [ ] Coverage meets thresholds
- [ ] README.md is up to date
- [ ] CHANGELOG.md has version entry
- [ ] package.json version bumped
- [ ] Git commit and tag created
- [ ] No sensitive data in package
- [ ] Dependencies are production-ready (no dev dependencies leaked)

## Rollback Strategy

If issues are found after publishing:

1. **Patch Release**: Fix and publish new patch version
2. **Deprecation**: Mark broken version as deprecated
   ```powershell
   npm deprecate @ellygent/cli@0.1.0 "Critical bug, use 0.1.1 instead"
   ```
3. **Unpublish** (only within 72 hours)

## Support Channels

After publishing, monitor:
- GitHub Issues for bug reports
- npm download stats
- User feedback

## License

Current: UNLICENSED (private/internal use)

If publishing publicly, update to appropriate open-source license (MIT, Apache-2.0, etc.)
