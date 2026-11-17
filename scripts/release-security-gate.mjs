#!/usr/bin/env node
/** Disabled-by-default publication gate. Reports must come from an independently trusted attested builder. */
import { readFileSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const basename = name => typeof name === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(name);

export function validateEvidence(evidence, { source, version, lockSha256, files, today = new Date().toISOString().slice(0,10) }) {
  if(!/^[a-f0-9]{64}$/.test(lockSha256||'')||evidence.lockSha256!==lockSha256||evidence.scans?.dependency?.lockSha256!==lockSha256)throw Error('Dependency report is not bound to the release lockfile');
  if(evidence.schema!==1||evidence.sourceCommit!==source||evidence.packageVersion!==version||evidence.builderWorkflow!=='EEQuality/ellygent-cli/.github/workflows/trusted-release-builder.yml')throw Error('Release identity/provenance evidence missing');
  if(!['cli','application'].includes(evidence.kind)||!Array.isArray(evidence.containerImages)||evidence.containerImages.some(image=>typeof image!=='string'||!/^[-a-zA-Z0-9./:]+@sha256:[a-f0-9]{64}$/.test(image))||(evidence.kind==='application'&&evidence.containerImages.length===0))throw Error('Immutable container artifact inventory required');
  for(const kind of ['dependency','container']) {
    const scan=evidence.scans?.[kind];
    if(kind==='container'&&evidence.containerImages.length===0) {if(scan?.status!=='not_applicable'||scan.reason!=='no-container-artifact')throw Error('Explicit no-container artifact decision required');continue;}
    if(kind==='container'&&JSON.stringify([...(scan?.scannedImages||[])].sort())!==JSON.stringify([...evidence.containerImages].sort()))throw Error('Container scan does not match release digests');
    if(!scan||!basename(scan.reportFile)||scan.status!=='complete'||!scan.scanner?.name||!scan.scanner?.version||!/^[a-f0-9]{64}$/.test(scan.scanner?.binarySha256||''))throw Error('Pinned scanner identity/complete result required');
    if(!Number.isInteger(scan.critical)||!Number.isInteger(scan.high)||scan.critical<0||scan.high<0)throw Error('Invalid severity totals');
    // Default triage policy: any high/critical blocks. Exceptions require a separate reviewed policy change.
    if(scan.critical||scan.high)throw Error('Unresolved high/critical vulnerability blocks publication');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(scan.databaseUpdated||'')||!Number.isFinite(Date.parse(scan.databaseUpdated))||new Date(scan.databaseUpdated).toISOString().slice(0,10)!==scan.databaseUpdated||scan.databaseUpdated>today||(Date.parse(today)-Date.parse(scan.databaseUpdated))>7*86400000)throw Error('Scanner database freshness evidence required');
  }
  if(!evidence.sbom||evidence.sbom.format!=='CycloneDX'||!basename(evidence.sbom.file))throw Error('CycloneDX SBOM required');
  if(!Array.isArray(evidence.files)||evidence.files.length<2)throw Error('Complete artifact/report hashes required');
  const seen=new Set();
  for(const artifact of evidence.files) {
    if(!basename(artifact.name)||seen.has(artifact.name)||!/^[a-f0-9]{64}$/.test(artifact.sha256||''))throw Error('Invalid artifact manifest');
    seen.add(artifact.name);
    if(hash(files(artifact.name))!==artifact.sha256)throw Error('Artifact/report checksum mismatch');
  }
  for(const kind of ['dependency','container'])if(evidence.scans[kind].status==='complete'&&!seen.has(evidence.scans[kind].reportFile))throw Error('Scanner report missing from attested checksum manifest');
  for(const name of evidence.kind==='cli'?['install.sh','install.ps1','install-runtime.mjs','distribution-summary.json']:[])if(!seen.has(name))throw Error('Published artifact is missing from attested checksum manifest');
  if(!seen.has(evidence.sbom.file))throw Error('SBOM not integrity-bound to attested evidence');
  const sbom=JSON.parse(files(evidence.sbom.file));if(sbom.bomFormat!=='CycloneDX'||(!Array.isArray(sbom.components)||sbom.components.length===0))throw Error('Invalid SBOM');
  return true;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 try {
  if(process.env.RELEASE_SECURITY_GATES_CONFIGURED!=='true')throw Error('Security builder/attestation not configured');
  const directory=process.env.RELEASE_EVIDENCE_DIRECTORY, gh=process.env.TRUSTED_GH_BINARY;
  if(!directory||!isAbsolute(directory)||!gh||!isAbsolute(gh)||!/^[a-f0-9]{64}$/.test(process.env.TRUSTED_GH_SHA256||''))throw Error('Trusted verifier/evidence prerequisite missing');
  if(hash(readFileSync(gh))!==process.env.TRUSTED_GH_SHA256)throw Error('Verifier binary pin mismatch');
  const file=join(directory,'release-evidence.json'), evidence=JSON.parse(readFileSync(file));
  const source=process.env.GITHUB_SHA;if(!/^[a-f0-9]{40}$/.test(source||''))throw Error('Exact source commit required');
  // Operator must provision this separate reviewed trusted-builder workflow and GitHub attestations.
  execFileSync(gh,['attestation','verify',file,'--repo','EEQuality/ellygent-cli','--signer-workflow','EEQuality/ellygent-cli/.github/workflows/trusted-release-builder.yml','--source-digest',source],{stdio:['ignore','ignore','ignore']});
  const version=JSON.parse(readFileSync('package.json')).version;
  validateEvidence(evidence,{source,version,lockSha256:hash(readFileSync('package-lock.json')),files:name=>readFileSync(join(directory,name))});
  if(evidence.kind!=='cli')throw Error('CLI publication requires CLI-specific evidence');
  if(process.env.GITHUB_OUTPUT)for(const [name,key] of [['install.sh','install_sh_sha'],['install.ps1','install_ps1_sha'],['install-runtime.mjs','install_runtime_sha'],['distribution-summary.json','distribution_summary_sha']])appendFileSync(process.env.GITHUB_OUTPUT,`${key}=${evidence.files.find(f=>f.name===name).sha256}\n`);
  console.log('Pinned scanner/SBOM/attested artifact release gate passed');
 } catch {console.error('Release security gate refused: trusted scan/SBOM/provenance prerequisites or policy failed');process.exitCode=1;}
}
