#!/usr/bin/env node

/**
 * Generate version metadata for frontend consumption
 * 
 * Creates dist/archives/version.json with download URLs and metadata
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
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

// Generate version metadata
const metadata = {
  version,
  releaseDate: new Date().toISOString().split('T')[0],
  downloads: {
    windows: {
      url: `/downloads/cli/latest/ellygent-v${version}-windows-x64.zip`,
      binary: `/downloads/cli/latest/ellygent-win-x64.exe`,
      checksum: checksumData.files[`ellygent-v${version}-windows-x64.zip`] || '',
      platform: 'windows',
      arch: 'x64',
    },
    linux: {
      url: `/downloads/cli/latest/ellygent-v${version}-linux-x64.tar.gz`,
      binary: `/downloads/cli/latest/ellygent-linux-x64`,
      checksum: checksumData.files[`ellygent-v${version}-linux-x64.tar.gz`] || '',
      platform: 'linux',
      arch: 'x64',
    },
    macosIntel: {
      url: `/downloads/cli/latest/ellygent-v${version}-macos-x64.tar.gz`,
      binary: `/downloads/cli/latest/ellygent-macos-x64`,
      checksum: checksumData.files[`ellygent-v${version}-macos-x64.tar.gz`] || '',
      platform: 'macos',
      arch: 'x64',
    },
    macosAppleSilicon: {
      url: `/downloads/cli/latest/ellygent-v${version}-macos-arm64.tar.gz`,
      binary: `/downloads/cli/latest/ellygent-macos-arm64`,
      checksum: checksumData.files[`ellygent-v${version}-macos-arm64.tar.gz`] || '',
      platform: 'macos',
      arch: 'arm64',
    },
  },
  npm: {
    package: '@ellygent/cli',
    version,
    install: 'npm install -g @ellygent/cli',
  },
  checksumAlgorithm: 'sha256',
};

// Write version.json
const versionJsonPath = path.join(archivesDir, 'version.json');
fs.writeFileSync(
  versionJsonPath,
  JSON.stringify(metadata, null, 2) + '\n',
  'utf-8'
);

console.log(`✓ Generated version metadata for v${version}`);
console.log(`\nMetadata written to: ${versionJsonPath}`);
console.log('\nDownload URLs:');
console.log(`  Windows:  ${metadata.downloads.windows.url}`);
console.log(`  Linux:    ${metadata.downloads.linux.url}`);
console.log(`  macOS Intel: ${metadata.downloads.macosIntel.url}`);
console.log(`  macOS ARM: ${metadata.downloads.macosAppleSilicon.url}`);
console.log('\n✨ Version metadata generated successfully!');
