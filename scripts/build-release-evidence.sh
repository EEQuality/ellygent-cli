#!/usr/bin/env bash
# Reviewed hosted-builder path, deliberately no release or write-capable repository token.
set -euo pipefail
: "${RUNNER_TEMP:?}" "${RELEASE_EVIDENCE_DIRECTORY:?}"
[[ "${GITHUB_SHA:-}" =~ ^[0-9a-f]{40}$ ]]
[[ "${GITHUB_REF_PROTECTED:-}" = true ]]
[[ "${TRIVY_VERSION:-}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
[[ "${TRIVY_ARCHIVE_SHA256:-}" =~ ^[0-9a-f]{64}$ ]]
scratch=$(mktemp -d "$RUNNER_TEMP/cli-builder.XXXXXX")
out="$RELEASE_EVIDENCE_DIRECTORY"
mkdir "$out" "$scratch/bundle"
version=$(node -p 'require("./package.json").version')
test "$GITHUB_REF" = "refs/tags/v$version"
test "$(git rev-parse HEAD)" = "$GITHUB_SHA"
npm ci --ignore-scripts
npm run build
test "$(node dist/index.js --version)" = "$version"
FRONTEND_ROOT="$scratch/bundle" npm run publish:frontend
cp "$scratch/bundle/public/cli"/{install.sh,install.ps1,install-runtime.mjs,distribution-summary.json} "$out/"
npm pack --ignore-scripts --pack-destination "$out"
(cd "$out"; sha256sum install.sh install.ps1 install-runtime.mjs distribution-summary.json > SHA256SUMS)
npm sbom --package-lock-only --sbom-format cyclonedx > "$out/sbom.json"
os_archive="trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz"
curl --fail --silent --show-error --location --max-time 120 "https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/$os_archive" --output "$scratch/$os_archive"
printf '%s  %s\n' "$TRIVY_ARCHIVE_SHA256" "$scratch/$os_archive" | sha256sum -c -
tar -xOf "$scratch/$os_archive" trivy > "$scratch/trivy"
chmod 0700 "$scratch/trivy"
cache="$scratch/cache"
# Scan the exact full lockfile, without vendored dependencies, project config or ignore rules.
mkdir "$scratch/scan"
cp package.json package-lock.json "$scratch/scan/"
(
  cd "$scratch/scan"
  "$scratch/trivy" fs --cache-dir "$cache" --scanners vuln --download-db-only --no-progress
  "$scratch/trivy" fs --cache-dir "$cache" --scanners vuln --skip-db-update --offline-scan --no-progress --include-dev-deps --list-all-pkgs --format json --output "$out/dependency-report.json" .
)
node scripts/generate-release-evidence.mjs "$out" "$scratch/trivy" "$cache/db/metadata.json"
