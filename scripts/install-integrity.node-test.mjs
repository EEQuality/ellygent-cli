import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { RELEASE, install, rollback, selectRelease, verifySource } from './install-runtime.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const root = resolve(import.meta.dirname,'..');
// Preserve historical trusted-release bytes independently of current dependencies.
const releaseFixture = join(root, 'scripts', 'fixtures', 'v0.1.2');
const lock = readFileSync(join(releaseFixture, 'package-lock.json'));
const metadata = readFileSync(join(releaseFixture, 'package.json'));
function fixture(stage) { writeFileSync(join(stage,'package.json'),metadata); writeFileSync(join(stage,'package-lock.json'),lock); }
function runner({failBuild=false,wrongVersion=false,failCI=false,wrongCommit=false,wrongBlob=false}={}) {
  return (program,args,cwd) => {
    if(program==='git') {
      if(args.includes('ls-files'))return ['package.json','package-lock.json'].map(name=>{const bytes=readFileSync(join(cwd,name));return `100644 ${wrongBlob?'d'.repeat(40):createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex')} 0\t${name}\0`;}).join('');
      return args.includes('rev-parse')?(wrongCommit?'a'.repeat(40):RELEASE.commit):'';
    }
    if(args.includes('ci')) { assert.ok(args.includes('--ignore-scripts')); assert.ok(!args.includes('install'));if(failCI)throw Error('synthetic dependency failure');return ''; }
    if(args.includes('build')) { if(failBuild)throw Error('synthetic build failure');mkdirSync(join(cwd,'dist'),{recursive:true});writeFileSync(join(cwd,'dist/index.js'),'console.log("0.1.2");');return ''; }
    if(args.includes('--version')) return wrongVersion?'0.0.0':'0.1.2';
    throw Error('Unexpected command fixture');
  };
}
function isolated(fn) { const temp=mkdtempSync(join(tmpdir(),'ellygent-install-fixture-'));try{return fn(temp);}finally{rmSync(temp,{recursive:true,force:true});} }

test('default is independently pinned audited commit and lock; main cannot silently replace it',()=>{
 assert.equal(selectRelease({}).commit,RELEASE.commit);assert.equal(hash(lock),RELEASE.lockSha256);
 assert.throws(()=>selectRelease({VERSION:'main'}));assert.throws(()=>selectRelease({VERSION:'v9.9.9'}));
 assert.throws(()=>selectRelease({VERSION:'main',ELLYGENT_DEV_CHECKOUT:'1'}));
 assert.equal(selectRelease({VERSION:'main',ELLYGENT_DEV_CHECKOUT:'1',ELLYGENT_EXPECTED_COMMIT:RELEASE.commit,ELLYGENT_EXPECTED_LOCK_SHA256:RELEASE.lockSha256,ELLYGENT_EXPECTED_VERSION:RELEASE.version}).development,true);
});
test('source identity, commit and lock mismatch refuse before npm',()=>isolated(temp=>{
 fixture(temp);verifySource(temp,RELEASE,RELEASE.commit);
 assert.throws(()=>verifySource(temp,RELEASE,'a'.repeat(40)));
 writeFileSync(join(temp,'package-lock.json'),'synthetic modified lock');assert.throws(()=>verifySource(temp,RELEASE,RELEASE.commit));
}));
test('clean managed install has exact receipt/version and no global uninstall; both aliases share it',()=>isolated(temp=>{
 const env={ELLYGENT_INSTALL_ROOT:join(temp,'install')};const result=install({env,populate:fixture,run:runner()});
 assert.equal(result.version,'0.1.2');assert.equal(JSON.parse(readFileSync(join(result.generation,'install-receipt.json'))).commit,RELEASE.commit);
 for(const name of ['ellygent','ellygent-cli','ellygent.cmd','ellygent-cli.cmd'])assert.ok(existsSync(join(result.bin,name)));
 assert.ok(readFileSync(join(result.bin,'ellygent-launcher.mjs'),'utf8').includes('current.json'));
}));
test('dependency/build/version/commit failures preserve complete existing working selection',()=>isolated(temp=>{
 const env={ELLYGENT_INSTALL_ROOT:join(temp,'install')};install({env,populate:fixture,run:runner()});
 const before=readFileSync(join(env.ELLYGENT_INSTALL_ROOT,'current.json'));
 for(const options of [{failCI:true},{failBuild:true},{wrongVersion:true},{wrongCommit:true},{wrongBlob:true}]) {
  assert.throws(()=>install({env,populate:fixture,run:runner(options)}));assert.deepEqual(readFileSync(join(env.ELLYGENT_INSTALL_ROOT,'current.json')),before);
 }
}));
test('promotion failure and deliberate rollback preserve/recover verified version identity',()=>isolated(temp=>{
 const env={ELLYGENT_INSTALL_ROOT:join(temp,'install')};const first=install({env,populate:fixture,run:runner()});
 const before=readFileSync(join(env.ELLYGENT_INSTALL_ROOT,'current.json'));
 assert.throws(()=>install({env,populate:fixture,run:runner(),promote:()=>{throw Error('synthetic atomic promotion failure');}}));
 assert.deepEqual(readFileSync(join(env.ELLYGENT_INSTALL_ROOT,'current.json')),before);
 const second=install({env,populate:fixture,run:runner()});assert.notEqual(second.generation,first.generation);
 const result=rollback({env,run:runner()});assert.equal(result.commit,RELEASE.commit);
 assert.equal(JSON.parse(readFileSync(join(env.ELLYGENT_INSTALL_ROOT,'current.json'))).current,first.generation);
 writeFileSync(join(second.generation,'dist/index.js'),'synthetic modified executable');
 assert.throws(()=>rollback({env,run:runner()}));
 assert.equal(JSON.parse(readFileSync(join(env.ELLYGENT_INSTALL_ROOT,'current.json'))).current,first.generation);
}));
test('hosted wrapper verifies common runtime before execution on POSIX and Windows',()=>{
 const expected=hash(readFileSync(join(root,'scripts/install-runtime.mjs')));
 for(const name of ['install.sh','install.ps1']) {
  const content=readFileSync(join(root,'scripts',name),'utf8');assert.ok(content.includes(expected));assert.ok(!content.includes('npm uninstall'));assert.ok(content.includes('v0.1.2'));
 }
 const shell=readFileSync(join(root,'scripts/install.sh'),'utf8');assert.ok(shell.includes('curl --disable'));assert.ok(!shell.includes('curl -k'));
 const powershell=readFileSync(join(root,'scripts/install.ps1'),'utf8');assert.ok(powershell.indexOf('Get-FileHash')<powershell.indexOf('& $Node $Runtime'));assert.ok(!powershell.includes('iex'));
});
