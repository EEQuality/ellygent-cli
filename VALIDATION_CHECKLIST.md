# CLI Distribution Pipeline - Validation Checklist

## Pre-Release Validation

### ✅ Code Quality

- [x] All TypeScript compiles without errors
- [x] No linting errors in scripts
- [x] Frontend components have no type errors
- [x] All scripts are executable (chmod +x for .sh)

### ✅ Build Scripts

- [ ] `build-binaries.js` runs successfully
- [ ] `create-archives.js` creates .zip and .tar.gz
- [ ] `generate-checksums.js` creates checksums.txt and checksums.json
- [ ] `generate-version-metadata.js` creates version.json
- [ ] `publish-to-frontend.js` copies files to frontend

**Test Command:**
```bash
cd ellygent-cli
npm run build:release
```

**Expected Output:**
```
dist/bin/
  ellygent-win-x64.exe
  ellygent-linux-x64
  ellygent-macos-x64
  ellygent-macos-arm64
dist/archives/
  ellygent-v0.1.0-*.{zip,tar.gz}
  checksums.txt
  checksums.json
  version.json
```

### ✅ Frontend Integration

- [ ] CLIDownloads component renders without errors
- [ ] Platform detection works
- [ ] Download URLs are correct
- [ ] Checksums display correctly
- [ ] Installation instructions expand/collapse
- [ ] npm instructions are visible

**Test Command:**
```bash
cd ellygent-frontend
npm run dev
# Visit http://localhost:3000/cli
```

### ✅ Installer Scripts

#### Unix (install.sh)
- [ ] Platform detection works (Linux/macOS)
- [ ] Architecture detection works (x64/ARM64)
- [ ] Downloads binary correctly
- [ ] Checksum verification works (if sha256sum available)
- [ ] Installs to /usr/local/bin or custom path
- [ ] Binary is executable after install
- [ ] PATH is configured correctly
- [ ] Success message displays

**Test Command:**
```bash
# Set test variables
export BASE_URL="http://localhost:3000/downloads/cli"
export VERSION="latest"
./scripts/install.sh
```

#### Windows (install.ps1)
- [ ] Architecture detection works (x64/ARM64)
- [ ] Downloads binary correctly
- [ ] Checksum verification works
- [ ] Installs to %LOCALAPPDATA%\Ellygent\bin
- [ ] Adds to PATH automatically
- [ ] Success message displays

**Test Command:**
```powershell
$env:BASE_URL = "http://localhost:3000/downloads/cli"
$env:VERSION = "latest"
.\scripts\install.ps1
```

### ✅ GitHub Actions Workflow

- [ ] Workflow syntax is valid (.github/workflows/release.yml)
- [ ] All steps are defined correctly
- [ ] Secrets are properly referenced
- [ ] Artifact upload paths are correct
- [ ] GitHub Release creation is configured

**Validation:**
```bash
# Install act (GitHub Actions local runner)
# Or validate syntax online at:
# https://rhysd.github.io/actionlint/
```

### ✅ Documentation

- [ ] README.md updated with installation methods
- [ ] PUBLISHING.md describes release workflow
- [ ] CHANGELOG.md has unreleased section
- [ ] DISTRIBUTION.md is comprehensive
- [ ] QUICKSTART.md is clear and actionable
- [ ] IMPLEMENTATION_SUMMARY.md is complete

### ✅ Git Configuration

- [ ] .gitignore excludes dist/bin/
- [ ] .gitignore excludes dist/archives/
- [ ] Frontend .gitignore excludes public/downloads/cli/
- [ ] All necessary files are committed
- [ ] No sensitive data in repository

### ✅ Version Consistency

- [ ] package.json version is correct
- [ ] CHANGELOG.md matches package.json version
- [ ] No version conflicts in metadata

## First Release Validation

### Pre-Tag Checklist

- [ ] All tests pass: `npm test`
- [ ] TypeScript builds: `npm run build`
- [ ] Local binary build succeeds: `npm run build:release`
- [ ] Version bumped: `npm version patch`
- [ ] CHANGELOG.md updated
- [ ] All changes committed

### Tag and Push

```bash
# Verify current version
node -p "require('./package.json').version"

# Create tag
git tag v0.1.1

# Push tag (triggers automation)
git push origin v0.1.1
```

### Post-Release Validation

- [ ] GitHub Actions workflow completed successfully
- [ ] GitHub Release created with correct version
- [ ] Release contains all expected artifacts:
  - [ ] ellygent-v0.1.1-windows-x64.zip
  - [ ] ellygent-v0.1.1-linux-x64.tar.gz
  - [ ] ellygent-v0.1.1-macos-x64.tar.gz
  - [ ] ellygent-v0.1.1-macos-arm64.tar.gz
  - [ ] checksums.txt
  - [ ] checksums.json
  - [ ] version.json
- [ ] Frontend repo has new commit with CLI artifacts
- [ ] Files exist in frontend public/downloads/cli/latest/
- [ ] Installer scripts copied to public/cli/

### Download Validation

**Windows:**
```bash
# Visit https://ellygent.com/cli
# Click Windows download
# Extract and verify
./ellygent-win-x64.exe --version
```

**Linux:**
```bash
curl -fsSL https://ellygent.com/cli/install.sh | sh
ellygent --version
```

**macOS:**
```bash
curl -fsSL https://ellygent.com/cli/install.sh | sh
ellygent --version
```

**npm:**
```bash
npm install -g @ellygent/cli
ellygent --version
```

### Checksum Validation

```bash
# Download checksums
curl -O https://ellygent.com/downloads/cli/latest/checksums.txt

# Verify (Linux/macOS)
sha256sum -c checksums.txt

# Verify (Windows)
Get-FileHash ellygent-win-x64.exe
# Compare with checksums.txt
```

### Functional Validation

- [ ] Binary runs without Node.js installed
- [ ] `ellygent --version` works
- [ ] `ellygent --help` works
- [ ] `ellygent login` prompts correctly
- [ ] Authentication flow works
- [ ] Commands execute properly

## Rollback Procedure

If release has critical issues:

**1. Identify last good version:**
```bash
# List releases
gh release list

# Or check frontend
ls ellygent-frontend/public/downloads/cli/
```

**2. Rollback frontend:**
```bash
cd ellygent-frontend
cd public/downloads/cli/

# Copy previous version to latest
rm -rf latest
cp -r v0.1.0 latest

# Commit
git add .
git commit -m "Rollback CLI to v0.1.0"
git push origin main
```

**3. Mark GitHub Release as pre-release:**
```bash
gh release edit v0.1.1 --prerelease
```

**4. Communicate:**
- Update release notes
- Notify users via appropriate channels

## Success Metrics

### Technical
- [ ] Zero build errors
- [ ] Zero TypeScript errors
- [ ] Zero runtime errors during install
- [ ] Checksums verify correctly
- [ ] All platforms install successfully

### User Experience
- [ ] Installation takes < 30 seconds
- [ ] Download page loads in < 2 seconds
- [ ] Platform auto-detected correctly
- [ ] Instructions are clear
- [ ] Error messages are helpful

### Automation
- [ ] Release pipeline completes in < 10 minutes
- [ ] No manual intervention required
- [ ] Artifacts published automatically
- [ ] Frontend updates automatically

## Common Issues and Solutions

### Build fails with pkg error
**Symptom:** `pkg` command fails  
**Solution:** Ensure `@yao-pkg/pkg` is installed: `npm install --save-dev @yao-pkg/pkg`

### Archives missing files
**Symptom:** tar.gz or zip empty  
**Solution:** Verify binaries exist in `dist/bin/` before creating archives

### Checksums don't match
**Symptom:** sha256sum verification fails  
**Solution:** Regenerate checksums: `npm run build:checksums`

### Frontend files not copied
**Symptom:** `publish-to-frontend.js` fails  
**Solution:** Ensure `../ellygent-frontend` exists and is accessible

### GitHub Actions fails
**Symptom:** Workflow errors  
**Solution:** Check workflow logs, verify secrets, ensure tag format is `v*.*.*`

### Download 404
**Symptom:** Binary download returns 404  
**Solution:** Verify files in `public/downloads/cli/latest/`, deploy frontend

## Final Sign-Off

Before considering the release complete:

- [ ] All validation checks passed
- [ ] At least one successful end-to-end test per platform
- [ ] Documentation reviewed and accurate
- [ ] No known critical issues
- [ ] Rollback procedure tested (in staging)
- [ ] Team notified of new release

**Signed off by:** _________________  
**Date:** _________________  
**Version:** _________________

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-23  
**Next Review:** On first production release
