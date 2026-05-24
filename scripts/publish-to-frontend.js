#!/usr/bin/env node

/**
 * Publish CLI distribution artifacts to frontend static directory
 * 
 * Copies binaries, archives, checksums, and metadata to:
 * ellygent-frontend/public/downloads/cli/
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Source directories
const binDir = path.join(rootDir, 'dist', 'bin');
const archivesDir = path.join(rootDir, 'dist', 'archives');

// Target directory (frontend public)
const frontendRoot = path.resolve(rootDir, '..', 'ellygent-frontend');
const publicDownloadsDir = path.join(frontendRoot, 'public', 'downloads', 'cli');
const latestDir = path.join(publicDownloadsDir, 'latest');

console.log('🚀 Publishing CLI artifacts to frontend...\n');

// Verify frontend directory exists
if (!fs.existsSync(frontendRoot)) {
  console.error(`✗ Frontend directory not found: ${frontendRoot}`);
  console.error('  Ensure ellygent-frontend is located at ../ellygent-frontend');
  process.exit(1);
}

// Create target directories
[publicDownloadsDir, latestDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Created directory: ${path.relative(frontendRoot, dir)}`);
  }
});

// Read package.json for version
const packageJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8')
);
const version = packageJson.version;

// Create versioned directory
const versionedDir = path.join(publicDownloadsDir, `v${version}`);
if (!fs.existsSync(versionedDir)) {
  fs.mkdirSync(versionedDir, { recursive: true });
  console.log(`✓ Created directory: ${path.relative(frontendRoot, versionedDir)}`);
}

/**
 * Copy file and report
 */
function copyFile(sourcePath, targetPath) {
  const fileName = path.basename(sourcePath);
  
  if (!fs.existsSync(sourcePath)) {
    console.warn(`⚠ Source file not found: ${fileName}`);
    return false;
  }

  fs.copyFileSync(sourcePath, targetPath);
  const stats = fs.statSync(targetPath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  console.log(`✓ Copied: ${fileName} (${sizeKB} KB)`);
  return true;
}

// Copy binaries
console.log('\nCopying binaries...');
const binaries = [
  'ellygent-win-x64.exe',
  'ellygent-linux-x64',
  'ellygent-macos-x64',
  'ellygent-macos-arm64',
];

binaries.forEach((binary) => {
  const source = path.join(binDir, binary);
  copyFile(source, path.join(latestDir, binary));
  copyFile(source, path.join(versionedDir, binary));
});

// Copy archives
console.log('\nCopying archives...');
const archives = fs.readdirSync(archivesDir).filter((file) => {
  return file.endsWith('.zip') || file.endsWith('.tar.gz');
});

archives.forEach((archive) => {
  const source = path.join(archivesDir, archive);
  copyFile(source, path.join(latestDir, archive));
  copyFile(source, path.join(versionedDir, archive));
});

// Copy metadata files
console.log('\nCopying metadata...');
const metadataFiles = ['checksums.txt', 'checksums.json', 'version.json'];

metadataFiles.forEach((file) => {
  const source = path.join(archivesDir, file);
  copyFile(source, path.join(latestDir, file));
  copyFile(source, path.join(versionedDir, file));
});

// Copy installer scripts to /cli/ directory
console.log('\nCopying installer scripts...');
const cliDir = path.join(frontendRoot, 'public', 'cli');
if (!fs.existsSync(cliDir)) {
  fs.mkdirSync(cliDir, { recursive: true });
}

const installerScripts = [
  { source: path.join(rootDir, 'scripts', 'install.sh'), target: 'install.sh' },
  { source: path.join(rootDir, 'scripts', 'install.ps1'), target: 'install.ps1' },
];

installerScripts.forEach(({ source, target }) => {
  const targetPath = path.join(cliDir, target);
  copyFile(source, targetPath);
});

// Generate distribution summary
const summary = {
  version,
  publishedAt: new Date().toISOString(),
  directories: {
    latest: path.relative(frontendRoot, latestDir),
    versioned: path.relative(frontendRoot, versionedDir),
  },
  files: {
    binaries: binaries.length,
    archives: archives.length,
    metadata: metadataFiles.length,
    installers: installerScripts.length,
  },
};

const summaryPath = path.join(publicDownloadsDir, 'distribution-summary.json');
fs.writeFileSync(
  summaryPath,
  JSON.stringify(summary, null, 2) + '\n',
  'utf-8'
);

console.log(`\n✨ CLI artifacts published successfully!`);
console.log(`\nPublished to:`);
console.log(`  Latest:   ${path.relative(process.cwd(), latestDir)}`);
console.log(`  Versioned: ${path.relative(process.cwd(), versionedDir)}`);
console.log(`\nVersion: ${version}`);
console.log('Files published: ' + (binaries.length + archives.length + metadataFiles.length + installerScripts.length));
