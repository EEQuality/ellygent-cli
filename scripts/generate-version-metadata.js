#!/usr/bin/env node

/**
 * Generate version metadata for frontend consumption
 *
 * Creates dist/archives/manifest.json and dist/archives/version.json with
 * download URLs and metadata.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const binDir = path.join(rootDir, 'dist', 'bin');
const archivesDir = path.join(rootDir, 'dist', 'archives');

console.log('📋 Generating version metadata...\n');

// Read package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8')
);
const version = packageJson.version;

// Read checksums
let checksumData = { files: {} };
const checksumJsonPath = path.join(archivesDir, 'checksums.json');
if (fs.existsSync(checksumJsonPath)) {
  checksumData = JSON.parse(fs.readFileSync(checksumJsonPath, 'utf-8'));
}

function buildDownload(fileName, platform, arch) {
  const checksum = checksumData.files[fileName];
  const binaryPath = path.join(binDir, fileName);

  if (!checksum || !fs.existsSync(binaryPath)) {
    return null;
  }

  return {
    file: fileName,
    url: `/downloads/cli/latest/${fileName}`,
    sha256: checksum,
    platform,
    arch,
  };
}

function buildDownloads() {
  const downloads = {};

  const windowsX64 = buildDownload('ellygent-win-x64.exe', 'windows', 'x64');
  if (windowsX64) {
    downloads.windows = { x64: windowsX64 };
  }

  const linuxX64 = buildDownload('ellygent-linux-x64', 'linux', 'x64');
  if (linuxX64) {
    downloads.linux = { x64: linuxX64 };
  }

  const macosX64 = buildDownload('ellygent-macos-x64', 'macos', 'x64');
  const macosArm64 = buildDownload('ellygent-macos-arm64', 'macos', 'arm64');
  if (macosX64 || macosArm64) {
    downloads.macos = {};
    if (macosX64) {
      downloads.macos.x64 = macosX64;
    }
    if (macosArm64) {
      downloads.macos.arm64 = macosArm64;
    }
  }

  return downloads;
}

const manifest = {
  version,
  releasedAt: new Date().toISOString().split('T')[0],
  downloads: buildDownloads(),
  checksumAlgorithm: 'sha256',
};

// Write manifest.json and version.json for compatibility
const manifestJsonPath = path.join(archivesDir, 'manifest.json');
fs.writeFileSync(manifestJsonPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

const versionJsonPath = path.join(archivesDir, 'version.json');
fs.writeFileSync(versionJsonPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

console.log(`✓ Generated version metadata for v${version}`);
console.log(`\nMetadata written to: ${manifestJsonPath}`);
console.log('\nDownload URLs:');
if (manifest.downloads.windows?.x64) {
  console.log(`  Windows:  ${manifest.downloads.windows.x64.url}`);
}
if (manifest.downloads.linux?.x64) {
  console.log(`  Linux:    ${manifest.downloads.linux.x64.url}`);
}
if (manifest.downloads.macos?.x64) {
  console.log(`  macOS Intel: ${manifest.downloads.macos.x64.url}`);
}
if (manifest.downloads.macos?.arm64) {
  console.log(`  macOS ARM: ${manifest.downloads.macos.arm64.url}`);
}
console.log('\n✨ Version metadata generated successfully!');
