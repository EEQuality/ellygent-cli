#!/usr/bin/env node

/**
 * Build standalone binaries for all target platforms using pkg
 * 
 * Generates:
 * - dist/bin/ellygent-win-x64.exe
 * - dist/bin/ellygent-linux-x64
 * - dist/bin/ellygent-macos-x64
 * - dist/bin/ellygent-macos-arm64
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const binDir = path.join(distDir, 'bin');

// Ensure directories exist
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

console.log('🔨 Building standalone binaries...\n');

// Read package.json for version
const packageJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8')
);
const version = packageJson.version;

console.log(`Version: ${version}\n`);

// Detect current platform
const currentPlatform = process.platform;
const currentArch = process.arch;

console.log(`Current platform: ${currentPlatform}-${currentArch}\n`);

// Build configurations for each platform
const allTargets = [
  { platform: 'win', arch: 'x64', ext: '.exe', node: 'node20', buildPlatform: 'win32' },
  { platform: 'linux', arch: 'x64', ext: '', node: 'node20', buildPlatform: 'linux' },
  { platform: 'macos', arch: 'x64', ext: '', node: 'node20', buildPlatform: 'darwin' },
  { platform: 'macos', arch: 'arm64', ext: '', node: 'node20', buildPlatform: 'darwin' },
];

// In CI mode, build all targets. Locally, only build for current platform
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const targets = isCI ? allTargets : allTargets.filter(t => {
  // On Windows, only build Windows binaries
  if (currentPlatform === 'win32') return t.buildPlatform === 'win32';
  // On Linux, only build Linux binaries  
  if (currentPlatform === 'linux') return t.buildPlatform === 'linux';
  // On macOS, build all macOS binaries
  if (currentPlatform === 'darwin') return t.buildPlatform === 'darwin';
  return false;
});

if (!isCI) {
  console.log('⚠️  Local build mode: Only building for current platform');
  console.log(`   For full multi-platform build, set CI=true or run in GitHub Actions\n`);
}

targets.forEach(({ platform, arch, ext, node }) => {
  const outputName = `ellygent-${platform}-${arch}${ext}`;
  const outputPath = path.join(binDir, outputName);
  const target = `${node}-${platform}-${arch}`;

  console.log(`Building ${outputName}...`);

  try {
    // Use pkg to create standalone binary
    execSync(
      `npx pkg ./dist/index.js --target ${target} --output ${outputPath} --compress GZip`,
      {
        cwd: rootDir,
        stdio: 'inherit',
      }
    );

    // Verify binary was created
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`✓ ${outputName} (${sizeMB} MB)\n`);
    } else {
      throw new Error(`Binary not created: ${outputPath}`);
    }
  } catch (error) {
    console.error(`✗ Failed to build ${outputName}`);
    console.error(error.message);
    process.exit(1);
  }
});

console.log('\n✨ All binaries built successfully!');
console.log(`\nBinaries located in: ${binDir}`);
