import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(join(tmpdir(), 'ellygent-installed-regression-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function compareExecutables(source, installed) {
  let count = 0;
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.isDirectory()) count += await compareExecutables(join(source, entry.name), join(installed, entry.name));
    else if (entry.name.endsWith('.js')) {
      assert.equal(hash(await readFile(join(installed, entry.name))), hash(await readFile(join(source, entry.name))), `Installed code differs: ${entry.name}`);
      count++;
    }
  }
  return count;
}

try {
  // Build is a prerequisite. Suppress lifecycle scripts so packaging cannot
  // silently rebuild a different artifact or run install hooks in this check.
  const packed = await exec(npm, ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary], { cwd: repo, timeout: 60000 });
  const [artifact] = JSON.parse(packed.stdout);
  assert.ok(artifact?.filename, 'npm pack did not produce an artifact');
  const prefix = join(temporary, 'prefix');
  await exec(npm, ['install', '--prefix', prefix, '--ignore-scripts', '--no-audit', '--no-fund', join(temporary, artifact.filename)], { cwd: temporary, timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
  const installed = join(prefix, 'node_modules', '@ellygent', 'cli');
  const metadata = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  const expected = JSON.parse(await readFile(join(repo, 'package.json'), 'utf8'));
  assert.equal(metadata.name, expected.name);
  assert.equal(metadata.version, expected.version);
  const count = await compareExecutables(join(repo, 'dist'), join(installed, 'dist'));
  assert.ok(count > 0, 'No installed JavaScript was compared');
  console.log(`PASS installed artifact: ${count} JavaScript files match the built checkout by SHA-256`);
  const result = await exec(process.execPath, [join(repo, 'scripts', 'executable-regressions.mjs')], {
    cwd: temporary,
    env: { ...process.env, REGRESSION_CASE: '', CLI_ENTRY: join(installed, 'dist', 'index.js'), EXPECTED_CLI_VERSION: expected.version },
    timeout: 120000,
    maxBuffer: 4 * 1024 * 1024,
  });
  process.stdout.write(result.stdout);
  console.log('PASS installed behavior: named baseline, files, single JSON result, invalid input, refresh rollback and cross-filesystem assertions');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
