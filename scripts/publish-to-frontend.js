#!/usr/bin/env node

/**
 * Publish CLI installer scripts to frontend static directory.
 *
 * Binary distribution was retired in favor of npm installation from
 * GitHub Release package assets.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Target directory (frontend public)
const frontendRoot = process.env.FRONTEND_ROOT
  ? path.resolve(process.env.FRONTEND_ROOT)
  : path.resolve(rootDir, '..', 'ellygent-frontend');
const publicDownloadsDir = path.join(frontendRoot, 'public', 'downloads', 'cli');

console.log('🚀 Publishing CLI installer scripts to frontend...\n');

// Verify frontend directory exists
if (!fs.existsSync(frontendRoot)) {
  console.error(`✗ Frontend directory not found: ${frontendRoot}`);
  console.error('  Ensure ellygent-frontend is located at ../ellygent-frontend');
  process.exit(1);
}

function clearDirectoryContents(directory) {
  if (!fs.existsSync(directory)) {
    return;
  }

  fs.readdirSync(directory).forEach((entry) => {
    const entryPath = path.join(directory, entry);
    const stats = fs.statSync(entryPath);

    if (stats.isDirectory()) {
      fs.rmSync(entryPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(entryPath);
    }
  });
}

if (fs.existsSync(publicDownloadsDir)) {
  fs.rmSync(publicDownloadsDir, { recursive: true, force: true });
  console.log(`✓ Removed retired download directory: ${path.relative(frontendRoot, publicDownloadsDir)}`);
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

// Generate installer summary
const packageJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8')
);
const version = packageJson.version;
const summary = {
  version,
  publishedAt: new Date().toISOString(),
  files: {
    installers: installerScripts.length,
  },
  distribution: {
    method: 'npm-github-release',
    repository: 'https://github.com/EEQuality/ellygent-cli',
    latestPackageUrl: 'https://github.com/EEQuality/ellygent-cli/releases/latest/download/ellygent-cli-latest.tgz',
  },
};

const summaryPath = path.join(cliDir, 'distribution-summary.json');
fs.writeFileSync(
  summaryPath,
  JSON.stringify(summary, null, 2) + '\n',
  'utf-8'
);

console.log(`\n✨ CLI installer scripts published successfully!`);
console.log(`\nPublished to:`);
console.log(`  Installers: ${path.relative(process.cwd(), cliDir)}`);
console.log(`\nVersion: ${version}`);
console.log('Files published: ' + (installerScripts.length + 1));
