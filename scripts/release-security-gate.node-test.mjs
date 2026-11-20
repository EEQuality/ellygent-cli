import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cliPublishedFiles, comparePublisherBytes, validateEvidence } from './release-security-gate.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture() {
 const files={'sbom.json':Buffer.from(JSON.stringify({bomFormat:'CycloneDX',components:[{name:'synthetic',version:'1.0.0'}]}))};
 files['dependency-report.json']=Buffer.from('{"synthetic":"dependency-scan"}');files['container-report.json']=Buffer.from('{"synthetic":"container-scan"}');
 for(const name of cliPublishedFiles('0.1.2'))files[name]=Buffer.from('synthetic-reviewed-artifact:'+name);
 const scanner={name:'synthetic-fixture-scanner',version:'1.0',binarySha256:'a'.repeat(64)};
 const evidence={schema:1,kind:'cli',appCommit:'e'.repeat(40),releaseRef:'refs/tags/v0.1.2',lockSha256:'c'.repeat(64),sourceCommit:'b'.repeat(40),packageVersion:'0.1.2',builderWorkflow:'EEQuality/ellygent-cli/.github/workflows/trusted-release-builder.yml',containerImages:[],scans:{dependency:{reportFile:'dependency-report.json',lockSha256:'c'.repeat(64),status:'complete',scanner,critical:0,high:0,databaseUpdated:'2026-11-16'},container:{status:'not_applicable',reason:'no-container-artifact'}},sbom:{format:'CycloneDX',file:'sbom.json'},files:Object.entries(files).map(([name,body])=>({name,sha256:hash(body)}))};
 return {evidence, options:{lockSha256:'c'.repeat(64),source:'b'.repeat(40),appCommit:'e'.repeat(40),version:'0.1.2',today:'2026-11-16',files:name=>files[name]}};
}
test('complete identity-bound synthetic evidence passes pure policy only, without claiming signatures',()=>{const {evidence,options}=fixture();assert.equal(validateEvidence(evidence,options),true);});
test('missing provenance identity or stale/invalid scanner databases fail closed',()=>{
 for(const date of ['2026-11-01','2026-99-99','2027-01-01']){const {evidence,options}=fixture();evidence.scans.dependency.databaseUpdated=date;assert.throws(()=>validateEvidence(evidence,options));}
 const {evidence,options}=fixture();evidence.sourceCommit='c'.repeat(40);assert.throws(()=>validateEvidence(evidence,options));
});
test('unresolved high and critical findings block publication without silent exceptions',()=>{
 for(const key of ['high','critical']){const {evidence,options}=fixture();evidence.scans.dependency[key]=1;assert.throws(()=>validateEvidence(evidence,options));}
});
test('all published bytes and SBOM require integrity binding',()=>{
 const {evidence,options}=fixture();evidence.files.find(file=>file.name==='install.sh').sha256='f'.repeat(64);assert.throws(()=>validateEvidence(evidence,options));
 const next=fixture();next.evidence.files=next.evidence.files.filter(file=>file.name!=='install.ps1');assert.throws(()=>validateEvidence(next.evidence,next.options));
});
test('CLI evidence requires the tag, pinned application, tarball and checksum bytes',()=>{
 for(const key of ['appCommit','releaseRef']){const {evidence,options}=fixture();delete evidence[key];assert.throws(()=>validateEvidence(evidence,options));}
 for(const name of ['SHA256SUMS','ellygent-cli-0.1.2.tgz']){const {evidence,options}=fixture();evidence.files=evidence.files.filter(file=>file.name!==name);assert.throws(()=>validateEvidence(evidence,options));}
});
test('a publisher cannot swap even one of the six artifacts after evidence verification',()=>{
 const {evidence,options}=fixture();
 assert.doesNotThrow(()=>comparePublisherBytes(evidence,options.version,options.files));
 for(const asset of cliPublishedFiles(options.version)){
  assert.throws(()=>comparePublisherBytes(evidence,options.version,name=>name===asset?'modified':options.files(name)));
 }
});
test('application containers require complete scans of exact immutable release image digests',()=>{
 const {evidence,options}=fixture();evidence.kind='application';assert.throws(()=>validateEvidence(evidence,options));
 evidence.containerImages=['registry.invalid/synthetic@sha256:'+'d'.repeat(64)];assert.throws(()=>validateEvidence(evidence,options));
 evidence.scans.container={...evidence.scans.dependency,reportFile:'container-report.json',scannedImages:[...evidence.containerImages]};assert.equal(validateEvidence(evidence,options),true);
 evidence.scans.container.scannedImages=['registry.invalid/other@sha256:'+'e'.repeat(64)];assert.throws(()=>validateEvidence(evidence,options));
});
