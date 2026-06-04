#!/usr/bin/env node

/**
 * Generate SHA256 checksums for all binaries and archives
 * 
 * Creates:
 * - dist/archives/checksums.txt
 * - dist/archives/checksums.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const binDir = path.join(rootDir, 'dist', 'bin');
const archivesDir = path.join(rootDir, 'dist', 'archives');
const packageJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8')
);
const version = packageJson.version;

console.log('🔐 Generating checksums...\n');

/**
 * Calculate SHA256 hash of a file
 */
function calculateSHA256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Generate checksums for all files in a directory
 */
function generateChecksums(directory, fileFilter = null) {
  const checksums = {};

  if (!fs.existsSync(directory)) {
    console.error(`Directory not found: ${directory}`);
    return checksums;
  }

  const files = fs.readdirSync(directory);

  files.forEach((file) => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      // Skip checksum files themselves
      if (
        file.startsWith('checksums.') ||
        file === 'manifest.json' ||
        file === 'version.json'
      ) {
        return;
      }

      // Apply filter if provided
      if (fileFilter && !fileFilter(file)) {
        return;
      }

      const hash = calculateSHA256(filePath);
      checksums[file] = hash;
      console.log(`${hash}  ${file}`);
    }
  });

  return checksums;
}

function isCurrentReleaseArchive(file) {
  return (
    file === `ellygent-v${version}-windows-x64.zip` ||
    file === `ellygent-v${version}-linux-x64.tar.gz` ||
    file === `ellygent-v${version}-macos-x64.tar.gz` ||
    file === `ellygent-v${version}-macos-arm64.tar.gz`
  );
}

// Generate checksums for binaries
console.log('Binaries:');
const binaryChecksums = generateChecksums(binDir);

// Generate checksums for archives
console.log('\nArchives:');
const archiveChecksums = generateChecksums(archivesDir, isCurrentReleaseArchive);

// Combine all checksums
const allChecksums = { ...binaryChecksums, ...archiveChecksums };

// Write checksums.txt (standard format)
const checksumLines = Object.entries(allChecksums)
  .map(([file, hash]) => `${hash}  ${file}`)
  .join('\n');

const checksumTxtPath = path.join(archivesDir, 'checksums.txt');
fs.writeFileSync(checksumTxtPath, checksumLines + '\n', 'utf-8');
console.log(`\n✓ Written: checksums.txt`);

// Write checksums.json (machine-readable)
const checksumJsonPath = path.join(archivesDir, 'checksums.json');
const checksumData = {
  version,
  generatedAt: new Date().toISOString(),
  algorithm: 'sha256',
  files: allChecksums,
};

fs.writeFileSync(
  checksumJsonPath,
  JSON.stringify(checksumData, null, 2) + '\n',
  'utf-8'
);
console.log(`✓ Written: checksums.json`);

console.log(`\n✨ Checksums generated successfully!`);
console.log(`\nChecksum files:`);
console.log(`  - ${checksumTxtPath}`);
console.log(`  - ${checksumJsonPath}`);
