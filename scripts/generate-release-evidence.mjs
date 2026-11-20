import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RELEASE } from './install-runtime.mjs';
import { cliPublishedFiles, validateEvidence } from './release-security-gate.mjs';

const [directory, scanner, database] = process.argv.slice(2);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const packageVersion = JSON.parse(readFileSync('package.json')).version;
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
const lockSha256 = hash(readFileSync('package-lock.json'));
const untouched = execFileSync('git', ['diff','--name-only',RELEASE.commit,sourceCommit,'--','src','package.json','package-lock.json','tsconfig.json'],{encoding:'utf8'}).trim();
if (sourceCommit !== process.env.GITHUB_SHA || RELEASE.version !== packageVersion || RELEASE.lockSha256 !== lockSha256 || untouched) throw Error('Source / app pin / lock identity mismatch');
const files = name => readFileSync(join(directory, name));
const reportFile = 'dependency-report.json';
const report = JSON.parse(files(reportFile));
const lockResult = report.Results?.filter(row => row.Type === 'npm' && /(?:^|\/)package-lock\.json$/.test(row.Target) && row.Packages?.length);
if (!lockResult?.length) throw Error('Scanner did not inventory the reviewed npm lock');
const vulnerabilities = lockResult.flatMap(row => row.Vulnerabilities ?? []);
const scannerVersion = execFileSync(scanner,['--version'],{encoding:'utf8'}).match(/^Version:\s+([0-9.]+)$/m)?.[1];
if (!scannerVersion || scannerVersion !== process.env.TRIVY_VERSION) throw Error('Scanner executable version mismatch');
const updated = JSON.parse(readFileSync(database)).UpdatedAt;
if (typeof updated !== 'string' || !Number.isFinite(Date.parse(updated)) || Date.parse(updated) > Date.now()) throw Error('Genuine scanner database timestamp required');
const dryRun = process.env.CLI_RELEASE_DRY_RUN === 'true';
const evidence = {
  schema: 1, kind: 'cli', appCommit: RELEASE.commit, releaseRef: process.env.GITHUB_REF,
  sourceCommit, packageVersion, lockSha256,
  builderWorkflow: dryRun
    ? 'EEQuality/ellygent-cli/.github/workflows/trusted-release-builder-dry-run.yml'
    : 'EEQuality/ellygent-cli/.github/workflows/trusted-release-builder.yml',
  ...(dryRun ? { dryRun: true } : {}),
  containerImages: [],
  scans: {
    dependency: {
      status: 'complete', reportFile, lockSha256,
      scanner: { name: 'Trivy', version: scannerVersion, binarySha256: hash(readFileSync(scanner)) },
      databaseUpdated: new Date(updated).toISOString().slice(0,10),
      high: vulnerabilities.filter(entry => entry.Severity === 'HIGH').length,
      critical: vulnerabilities.filter(entry => entry.Severity === 'CRITICAL').length,
    },
    container: { status: 'not_applicable', reason: 'no-container-artifact' },
  },
  sbom: { format: 'CycloneDX', file: 'sbom.json' },
  files: [...cliPublishedFiles(packageVersion), reportFile, 'sbom.json'].map(name => ({name,sha256:hash(files(name))})),
};
// Check the same file/scan policy locally for a rehearsal, without ever writing
// production-shaped evidence or weakening the production verifier.
if (dryRun && (process.env.GITHUB_EVENT_NAME !== 'pull_request' || !/^refs\/pull\/[1-9][0-9]*\/merge$/.test(evidence.releaseRef))) throw Error('Expected an isolated pull request rehearsal');
const checked = dryRun ? {...evidence,dryRun:undefined,releaseRef:`refs/tags/v${packageVersion}`,builderWorkflow:'EEQuality/ellygent-cli/.github/workflows/trusted-release-builder.yml'} : evidence;
validateEvidence(checked, {source:sourceCommit,version:packageVersion,appCommit:RELEASE.commit,lockSha256,files});
writeFileSync(join(directory,'release-evidence.json'),JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
