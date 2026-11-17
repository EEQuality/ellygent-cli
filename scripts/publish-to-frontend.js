#!/usr/bin/env node

/**
 * Publish CLI installer scripts to frontend static directory.
 *
 * Binary distribution was retired in favor of direct GitHub checkout
 * and local build installation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'node:crypto';
import { RELEASE } from './install-runtime.mjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Target directory (frontend public)
if (!process.env.FRONTEND_ROOT) throw Error('Explicit FRONTEND_ROOT is required; no implicit sibling write');
const frontendRoot = path.resolve(process.env.FRONTEND_ROOT);

console.log('🚀 Publishing CLI installer scripts to frontend...\n');

// Verify frontend directory exists
if (!fs.existsSync(frontendRoot)) {
  console.error(`✗ Frontend directory not found: ${frontendRoot}`);
  console.error('  Ensure ellygent-frontend is located at ../ellygent-frontend');
  process.exit(1);
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
  { source: path.join(rootDir, 'scripts', 'install-runtime.mjs'), target: 'install-runtime.mjs' },
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
  files: {
    installers: installerScripts.length,
  },
  distribution: {
    method: 'github-checkout',
    repository: 'https://github.com/EEQuality/ellygent-cli',
    defaultRef: RELEASE.commit,
    releaseTag: `v${RELEASE.version}`,
    sourceCommit: RELEASE.commit,
    lockSha256: RELEASE.lockSha256,
    signatureConfigured: false,
    independentBootstrapVerificationRequired: true,
    sha256: Object.fromEntries(installerScripts.map(({source,target}) => [target,createHash('sha256').update(fs.readFileSync(source)).digest('hex')])),
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
