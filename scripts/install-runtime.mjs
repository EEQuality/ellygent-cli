#!/usr/bin/env node
/** Verified source build into a versioned managed installation; never npm uninstall/global install. */
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RELEASE = Object.freeze({ version: '0.1.4', commit: '87f3a44c5b748514fb9305d4293a3a72cc1b8449', lockSha256: 'ad5f04da0a90d53e61609a9ba60a9ea9727e93b348047581497ae7fcf09e6678' });
const REPOSITORY = 'https://github.com/EEQuality/ellygent-cli.git';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const noOutput = ['ignore', 'pipe', 'pipe'];
const execute = (program, args, cwd, options = {}) => execFileSync(program, args, { cwd, env: options.env || process.env, stdio: noOutput, encoding: 'utf8', windowsHide: true });

/** Isolate Git before init/fetch/first checkout; inherited filters/templates never run. */
export function sourceGit(directory, privateConfigDirectory, run = execute) {
  mkdirSync(privateConfigDirectory, { recursive: true, mode: 0o700 });
  const empty = join(privateConfigDirectory, 'empty-config');
  const template = join(privateConfigDirectory, 'empty-template');
  writeFileSync(empty, '', { mode: 0o600 }); mkdirSync(template, { recursive: true, mode: 0o700 });
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
  Object.assign(environment, { GIT_CONFIG_GLOBAL: empty, GIT_CONFIG_SYSTEM: empty, GIT_CONFIG_NOSYSTEM: '1', GIT_ATTR_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' });
  const invoke = args => run('git', ['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', '-c', `core.attributesFile=${empty}`, '-c', `core.hooksPath=${template}`, '-c', 'core.fsmonitor=false', ...args], directory, { env: environment });
  return { invoke, initialize: () => invoke(['init', `--template=${template}`, '.']) };
}

/** Git status may be clean after a newline/encoding transform; compare raw blob bytes. */
export function verifyCheckoutBytes(directory, index) {
  const entries = index.split('\0').filter(Boolean);
  if (!entries.length) throw Error('No verified source index entries');
  const root = resolve(directory);
  for (const entry of entries) {
    const match = /^(100644|100755) ([a-f0-9]{40}) 0\t([\s\S]+)$/.exec(entry);
    if (!match) throw Error('Unsupported source entry or unresolved index');
    const path = resolve(root, match[3]);
    if (!path.startsWith(root + sep) || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) throw Error('Unsupported source path');
    const bytes = readFileSync(path);
    const blob = createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
    if (blob !== match[2]) throw Error('Checkout bytes differ from reviewed Git source');
  }
}

export function selectRelease(env = process.env) {
  const requested = env.VERSION || `v${RELEASE.version}`;
  if (!env.ELLYGENT_DEV_CHECKOUT && [RELEASE.version, `v${RELEASE.version}`].includes(requested)) return { ...RELEASE, development: false };
  if (env.ELLYGENT_DEV_CHECKOUT !== '1') throw Error('Unknown release: use a separately reviewed installer pin update; main requires explicit development opt-in');
  const { ELLYGENT_EXPECTED_COMMIT: commit, ELLYGENT_EXPECTED_LOCK_SHA256: lockSha256, ELLYGENT_EXPECTED_VERSION: version } = env;
  if (!/^[a-f0-9]{40}$/.test(commit || '') || /^0+$/.test(commit) || !/^[a-f0-9]{64}$/.test(lockSha256 || '') || !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version || '')) throw Error('Development checkout requires independently trusted full commit, lock SHA256 and package version');
  return { commit, lockSha256, version, development: true };
}

export function verifySource(source, selection, head) {
  if (head.trim() !== selection.commit) throw Error('Source commit does not match trusted pin');
  const metadata = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'));
  if (metadata.name !== '@ellygent/cli' || metadata.version !== selection.version) throw Error('Package identity does not match selected release');
  if (sha256(readFileSync(join(source, 'package-lock.json'))) !== selection.lockSha256) throw Error('Lockfile does not match trusted release pin');
  if (metadata.engines?.node !== '>=20.0.0') throw Error('Unexpected Node compatibility contract');
}

export function runtimeHashes(directory) {
  const hashes = {};
  function visit(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const full = join(path, entry.name), rel = relative(directory, full).split(sep).join('/');
      if (entry.isSymbolicLink()) throw Error('Symlink refused in executable artifact');
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) hashes[rel] = sha256(readFileSync(full));
      else throw Error('Unsupported executable artifact type');
    }
  }
  visit(join(directory, 'dist'));
  if (!hashes['dist/index.js']) throw Error('Missing built CLI entry point');
  hashes['package.json'] = sha256(readFileSync(join(directory, 'package.json')));
  hashes['package-lock.json'] = sha256(readFileSync(join(directory, 'package-lock.json')));
  return Object.fromEntries(Object.entries(hashes).sort());
}

function contained(root, candidate) {
  if (!isAbsolute(candidate) || !candidate.startsWith(root + sep) || relative(root, candidate).startsWith('..')) throw Error('Installation state escapes managed root');
  if (lstatSync(candidate).isSymbolicLink()) throw Error('Installation generation cannot be a symlink');
}
function readState(root) {
  const state = join(root, 'current.json');
  if (!existsSync(state)) return null;
  if (lstatSync(state).isSymbolicLink()) throw Error('Installation state cannot be a symlink');
  const parsed = JSON.parse(readFileSync(state, 'utf8'));
  if (parsed.schema !== 1 || typeof parsed.current !== 'string') throw Error('Invalid managed installation state');
  contained(root, parsed.current);
  if (parsed.previous) contained(root, parsed.previous);
  return parsed;
}
export function verifyGeneration(generation, run = execute) {
  const receipt = JSON.parse(readFileSync(join(generation, 'install-receipt.json'), 'utf8'));
  if (receipt.schema !== 1 || !/^[a-f0-9]{40}$/.test(receipt.commit) || !/^[a-f0-9]{64}$/.test(receipt.lockSha256)) throw Error('Missing installation identity receipt');
  const metadata = JSON.parse(readFileSync(join(generation, 'package.json'), 'utf8'));
  if (metadata.name !== '@ellygent/cli' || metadata.version !== receipt.version || sha256(readFileSync(join(generation, 'package-lock.json'))) !== receipt.lockSha256) throw Error('Installed identity mismatch');
  if (JSON.stringify(runtimeHashes(generation)) !== JSON.stringify(receipt.hashes)) throw Error('Installed executable checksum mismatch');
  if (run(process.execPath, [join(generation, 'dist/index.js'), '--version'], generation).trim() !== receipt.version) throw Error('Built CLI reports the wrong version');
  return receipt;
}
function atomicWrite(path, value) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, value, { mode: 0o600, flag: 'wx' });
  try { renameSync(temporary, path); } finally { rmSync(temporary, { force: true }); }
}
function npmCLI(env) {
  const candidates = [env.ELLYGENT_NPM_CLI, join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'), join(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'), join(dirname(process.execPath), '../share/nodejs/npm/bin/npm-cli.js')].filter(Boolean);
  const found = candidates.find(p => isAbsolute(p) && existsSync(p));
  if (!found) throw Error('Cannot locate installed npm CLI JavaScript; supply trusted absolute ELLYGENT_NPM_CLI');
  return found;
}
function installLaunchers(root) {
  const bin = join(root, 'bin'); mkdirSync(bin, { recursive: true, mode: 0o700 });
  const launcher = `#!/usr/bin/env node\nimport { readFileSync } from 'node:fs';\nimport { spawnSync } from 'node:child_process';\nimport { join, resolve, relative } from 'node:path';\nconst root=${JSON.stringify(root)};\nconst state=JSON.parse(readFileSync(join(root,'current.json'),'utf8'));\nconst rel=relative(root,state.current);\nif(state.schema!==1||!rel||rel.startsWith('..')||resolve(root,rel)!==state.current)process.exit(126);\nconst child=spawnSync(process.execPath,[join(state.current,'dist/index.js'),...process.argv.slice(2)],{stdio:'inherit'});\nprocess.exit(child.status??1);\n`;
  // Stable launchers are installed once. Existing files must match rather than be overwritten.
  const runtime = join(bin, 'ellygent-launcher.mjs');
  if (existsSync(runtime)) { if (readFileSync(runtime, 'utf8') !== launcher) throw Error('Managed launcher differs; explicit operator review required'); }
  else writeFileSync(runtime, launcher, { mode: 0o700, flag: 'wx' });
  for (const alias of ['ellygent', 'ellygent-cli']) {
    const posix = `#!/bin/sh\nexec node ${quoteShell(runtime)} "$@"\n`;
    const windows = `@echo off\r\nnode "${runtime.replaceAll('%','%%')}" %*\r\n`;
    for (const [name, content] of [[alias, posix], [`${alias}.cmd`, windows]]) {
      const path = join(bin, name);
      if (existsSync(path)) { if (readFileSync(path, 'utf8') !== content) throw Error('Managed command differs; explicit operator review required'); }
      else writeFileSync(path, content, { mode: 0o700, flag: 'wx' });
    }
  }
  return bin;
}
function quoteShell(value) { return `'${value.replaceAll("'", "'\\''")}'`; }

export function install({ env = process.env, run = execute, populate, promote = atomicWrite } = {}) {
  const selection = selectRelease(env);
  const root = resolve(env.ELLYGENT_INSTALL_ROOT || join(homedir(), '.local', 'share', 'ellygent-cli'));
  if (existsSync(root) && lstatSync(root).isSymbolicLink()) throw Error('Managed root cannot be a symlink');
  mkdirSync(join(root, 'versions'), { recursive: true, mode: 0o700 });
  const lock = join(root, '.install-lock'); mkdirSync(lock, { mode: 0o700 });
  let stage;
  try {
    const previous = readState(root);
    if (previous) verifyGeneration(previous.current, run);
    stage = mkdtempSync(join(root, 'versions', '.candidate-'));
    const git = sourceGit(stage, join(lock, 'git-config'), run);
    if (populate) populate(stage, selection);
    else {
      git.initialize(); git.invoke(['remote', 'add', 'origin', REPOSITORY]);
      git.invoke(['fetch', '--depth', '1', 'origin', selection.commit]);
      git.invoke(['checkout', '--detach', 'FETCH_HEAD']);
    }
    const head = git.invoke(['rev-parse', 'HEAD']);
    verifySource(stage, selection, head);
    verifyCheckoutBytes(stage, git.invoke(['ls-files', '--stage', '-z']));
    if (git.invoke(['status', '--porcelain']).trim()) throw Error('Source checkout is modified');
    const npm = populate ? 'synthetic-npm-cli.js' : npmCLI(env);
    const config = join(stage, '.installer-npmrc'), globalConfig = join(stage, '.installer-global-npmrc');
    writeFileSync(config, '', { mode: 0o600 }); writeFileSync(globalConfig, '', { mode: 0o600 });
    run(process.execPath, [npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--userconfig', config, '--globalconfig', globalConfig, '--cache', join(stage,'.npm-cache')], stage);
    run(process.execPath, [npm, 'run', 'build', '--ignore-scripts', '--userconfig', config, '--globalconfig', globalConfig], stage);
    // Build may not mutate the reviewed source package/lock identity.
    verifySource(stage, selection, head);
    const receipt = { schema: 1, version: selection.version, commit: selection.commit, lockSha256: selection.lockSha256, development: selection.development, hashes: runtimeHashes(stage) };
    writeFileSync(join(stage, 'install-receipt.json'), JSON.stringify(receipt), { mode: 0o600, flag: 'wx' });
    verifyGeneration(stage, run);
    const generation = join(root, 'versions', `${selection.version}-${selection.commit}-${randomUUID()}`);
    renameSync(stage, generation); stage = undefined;
    const bin = installLaunchers(root);
    // The only working-selection change occurs after all source/build/identity checks.
    promote(join(root, 'current.json'), JSON.stringify({ schema: 1, current: generation, previous: previous?.current || null })+'\n');
    return { version: selection.version, commit: selection.commit, bin, generation };
  } finally { if (stage) rmSync(stage, { recursive: true, force: true }); rmSync(lock, { recursive: true, force: true }); }
}

export function rollback({ env = process.env, run = execute, promote = atomicWrite } = {}) {
  const root = resolve(env.ELLYGENT_INSTALL_ROOT || join(homedir(), '.local', 'share', 'ellygent-cli'));
  const lock = join(root, '.install-lock'); mkdirSync(lock, { mode: 0o700 });
  try {
    const state = readState(root);
    if (!state?.previous) throw Error('No previous managed installation is available');
    const receipt = verifyGeneration(state.previous, run);
    promote(join(root, 'current.json'), JSON.stringify({ schema: 1, current: state.previous, previous: state.current })+'\n');
    return { version: receipt.version, commit: receipt.commit };
  } finally { rmSync(lock, { recursive: true, force: true }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (Number(process.versions.node.split('.')[0]) < 20) throw Error('Node.js20+ required');
    if(process.argv.length>3||![undefined,'install','rollback'].includes(process.argv[2]))throw Error('Use install or rollback');
    const result = process.argv[2] === 'rollback' ? rollback() : install();
    console.log(`Verified CLI ${result.version} at source ${result.commit}`);
    if (result.bin) console.log(`Managed command directory: ${result.bin}\nAdd this directory to PATH explicitly. Existing npm global installs were not removed.`);
  } catch { console.error('CLI installation refused or failed; the previous managed selection was preserved. Review prerequisites and trusted release pins.'); process.exitCode = 1; }
}
