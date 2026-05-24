#!/usr/bin/env node

/**
 * Create platform-specific archives (.zip for Windows, .tar.gz for Unix-like)
 * 
 * Input: dist/bin/ellygent-*
 * Output: dist/archives/ellygent-*.{zip,tar.gz}
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import * as tar from 'tar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const binDir = path.join(rootDir, 'dist', 'bin');
const archivesDir = path.join(rootDir, 'dist', 'archives');

// Ensure directories exist
if (!fs.existsSync(archivesDir)) {
  fs.mkdirSync(archivesDir, { recursive: true });
}

console.log('📦 Creating distribution archives...\n');

// Read package.json for version
const packageJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8')
);
const version = packageJson.version;

// Archive configurations
const archives = [
  {
    binary: 'ellygent-win-x64.exe',
    format: 'zip',
    output: `ellygent-v${version}-windows-x64.zip`,
  },
  {
    binary: 'ellygent-linux-x64',
    format: 'tar.gz',
    output: `ellygent-v${version}-linux-x64.tar.gz`,
  },
  {
    binary: 'ellygent-macos-x64',
    format: 'tar.gz',
    output: `ellygent-v${version}-macos-x64.tar.gz`,
  },
  {
    binary: 'ellygent-macos-arm64',
    format: 'tar.gz',
    output: `ellygent-v${version}-macos-arm64.tar.gz`,
  },
];

archives.forEach(({ binary, format, output }) => {
  const binaryPath = path.join(binDir, binary);
  const outputPath = path.join(archivesDir, output);

  // Skip if binary doesn't exist (platform-specific build)
  if (!fs.existsSync(binaryPath)) {
    console.log(`⏭️  Skipping ${output} (binary not found)`);
    return;
  }

  console.log(`Creating ${output}...`);

  try {
    if (format === 'zip') {
      // Create zip archive using adm-zip
      const zip = new AdmZip();
      zip.addLocalFile(binaryPath, '', binary);
      zip.writeZip(outputPath);
    } else if (format === 'tar.gz') {
      // Create tar.gz archive using tar package
      tar.create(
        {
          gzip: true,
          file: outputPath,
          cwd: binDir,
          sync: true,
        },
        [binary]
      );
    }

    // Verify archive was created
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`✓ ${output} (${sizeKB} KB)\n`);
    } else {
      throw new Error(`Archive not created: ${outputPath}`);
    }
  } catch (error) {
    console.error(`✗ Failed to create ${output}`);
    console.error(error.message);
    process.exit(1);
  }
});

console.log('\n✨ All archives created successfully!');
console.log(`\nArchives located in: ${archivesDir}`);
