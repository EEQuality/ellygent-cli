import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import AdmZip from 'adm-zip';
const root = await mkdtemp(join(tmpdir(), 'cli-regression-'));
const requests = [];
let mode = 'valid';
let crossTemp;
const manifest = { schema_version:'1', generated_at:'2026-11-16', project:{identifier:'fixture',name:'Fixture'}, version:{identifier:'B1',type:'baseline'}, contents:{requirements:true} };
const zip = new AdmZip();
zip.addFile('.ellygent/manifest.json', Buffer.from(JSON.stringify(manifest)));
zip.addFile('.ellygent/project-summary.md', Buffer.from('# B1 synthetic baseline'));
const server = createServer(async (req,res) => {
  assert.equal(req.headers.authorization, 'Bearer elly_pat_synthetic');
  let body = ''; for await (const chunk of req) body += chunk;
  const url = new URL(req.url, 'http://localhost');
  const payload = body ? JSON.parse(body) : {};
  const version = body ? payload.version_identifier : url.searchParams.get('version') ?? decodeURIComponent(url.pathname.split('/versions/')[1]?.split('/')[0] ?? '');
  requests.push({url:url.pathname, version});
  if (version !== 'B1' || mode === 'download') { res.writeHead(400); res.end('invalid baseline'); return; }
  if (url.pathname.endsWith('/contents')) { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({version:'B1',specifications:[{identifier:'B1',name:'B1'}],system_definitions:[],traceability:{available:false,relationship_count:0},architecture:{available:false},constraints:{available:false},glossary:{available:false}})); }
  else if (url.pathname.includes('exportProject')) res.end('synthetic ReqIF B1');
  else if (payload.format === 'markdown') {
    const markdownZip = new AdmZip();
    markdownZip.addFile('.ellygent/manifest.json',Buffer.from(JSON.stringify({...manifest,export_format:'markdown'})));
    markdownZip.addFile('.ellygent/index.md',Buffer.from('# B1 Markdown fixture'));
    markdownZip.addFile('.ellygent/export-report.json',Buffer.from(JSON.stringify({status:'complete',unavailable_assets:[],limitations:[]})));
    res.setHeader('Content-Type','application/zip');res.end(markdownZip.toBuffer());
  }
  else { res.setHeader('Content-Type','application/zip'); const invalid = new AdmZip(); invalid.addFile('.ellygent/manifest.json',Buffer.from('{}')); res.end(mode === 'invalid' ? Buffer.from('invalid ZIP') : mode === 'manifest' ? invalid.toBuffer() : zip.toBuffer()); }
});
await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); }).catch(async error => { await rm(root,{recursive:true,force:true}); throw error; });
const config = join(root,'config.json');
await writeFile(config, JSON.stringify({apiUrl:`http://127.0.0.1:${server.address().port}/api`, accessToken:'elly_pat_synthetic'}));
const executable = resolve(process.env.CLI_ENTRY ?? 'dist/index.js');
async function run(args, env={}) {
  return await new Promise((resolve,reject) => {
    const child = spawn(process.execPath,[executable,'--config',config,...args],{env:{...process.env,ELLYGENT_API_URL:'',ELLYGENT_TOKEN:'',...env},stdio:['ignore','pipe','pipe']});
    let stdout='',stderr=''; child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);child.on('error',reject);
    const timeout=setTimeout(()=>child.kill('SIGKILL'),15000);
    child.on('close',code=>{clearTimeout(timeout);resolve({code,stdout,stderr});});
  });
}
function success(result) { assert.equal(result.code,0,JSON.stringify(result)); const data=JSON.parse(result.stdout); assert.equal(typeof data,'object'); return data; }
async function digest(dir) {
  const values=[];
  for(const name of (await readdir(dir)).sort()) { const path=join(dir,name); values.push([name,(await stat(path)).isDirectory()?await digest(path):createHash('sha256').update(await readFile(path)).digest('hex')]); }
  return JSON.stringify(values);
}
try {
  const packageVersion = JSON.parse(await readFile(new URL('../package.json', import.meta.url),'utf8')).version;
  const versionResult = await run(['--version']);
  assert.equal(versionResult.code,0);
  assert.equal(versionResult.stdout.trim(),process.env.EXPECTED_CLI_VERSION ?? packageVersion);
  if (!process.env.REGRESSION_CASE?.startsWith('refresh')) {
  for(const flag of [['--version','B1'],['--version=B1']]) {
    assert.equal(success(await run(['context','inspect','--project','fixture',...flag,'--json'])).version,'B1');
    const workspace=await mkdtemp(join(root,'out-'));
    const data=success(await run(['context','pull','--project','fixture',...flag,'--json','--workspace',workspace]));
    assert.equal(data.version.identifier,'B1');assert.equal(await readFile(join(workspace,'.ellygent/project-summary.md'),'utf8'),'# B1 synthetic baseline');
    for(const format of ['reqif','reqifz']) {
      const out=join(workspace,`B1.${format}`);
      success(await run(['context','pull','--project','fixture',...flag,'--format',format,'--out',out,'--json']));
      assert.equal(await readFile(out,'utf8'),'synthetic ReqIF B1');
    }
  }
  for (const flags of [['--format','markdown'],['--format','md']]) {
    const result=await run(['context','inspect','--project','fixture','--version','B1',...flags]);
    assert.equal(result.code,0,JSON.stringify(result));
    assert.ok(result.stdout.includes('Context contents for fixture@B1'));
    assert.throws(()=>JSON.parse(result.stdout));
  }
  assert.equal(success(await run(['--format','markdown','context','inspect','--project','fixture','--version','B1','--json'])).version,'B1');
  for (const flag of [['--version','B1'],['--version=B1']]) {
    assert.equal(success(await run(['contents','--project','fixture',...flag,'--json'])).version,'B1');
    const workspace=await mkdtemp(join(root,'legacy-'));
    assert.equal(success(await run(['sync','--project','fixture',...flag,'--workspace',workspace,'--json'])).version.identifier,'B1');
    assert.equal(await readFile(join(workspace,'.ellygent/project-summary.md'),'utf8'),'# B1 synthetic baseline');
  }
  const markdown=join(root,'existing-markdown'); await mkdir(markdown);await writeFile(join(markdown,'keep.md'),'last good');
  const markdownArgs=['context','pull','--project','fixture','--version','B1','--format','markdown','--out',markdown,'--json'];
  const refused=await run(markdownArgs);
  assert.notEqual(refused.code,0);
  assert.match(JSON.parse(refused.stdout).message,/Output already exists:.*Use --overwrite/);
  assert.equal(await readFile(join(markdown,'keep.md'),'utf8'),'last good');
  const markdownResult=success(await run([...markdownArgs,'--overwrite']));
  assert.equal(markdownResult.version.identifier,'B1');
  assert.equal(await readFile(join(markdown,'index.md'),'utf8'),'# B1 Markdown fixture');
  await assert.rejects(readFile(join(markdown,'keep.md')), {code:'ENOENT'});
  for(const command of ['inspect','pull']) for(const flags of [['--version'],['--version='],['--version','INVALID'],[]]) {
    const args=['context',command,...(flags.length?['--project','fixture',...flags]:[]),'--json'];
    const result=await run(args);assert.notEqual(result.code,0,JSON.stringify(result));
  }
  for (const flags of [[],['--version','main'],['--version','B1']]) {
    const result=await run(['context','pull','--project','fixture','--format','reqif',...flags,'--json']);
    assert.notEqual(result.code,0,JSON.stringify(result));
  }
  console.log('PASS named baselines: both syntaxes, inspect/context/ReqIF artifacts, single JSON, invalid/missing input');
  }
  if (process.env.REGRESSION_CASE !== 'named') {
  const workspace=await mkdtemp(join(root,'refresh-'));const target=join(workspace,'.ellygent');await mkdir(target);
  await writeFile(join(target,'old.bin'),Buffer.from([0,1,2,255]));const before=await digest(target);
  const preload=join(root,'fail-promotion.cjs');
  await writeFile(preload,`const fs=require('node:fs/promises');const original=fs.rename;fs.rename=async function(a,b){if((process.env.FAIL_ROLLBACK==='1'&&String(a).endsWith('/.ellygent.previous'))||String(a).includes('.ellygent-stage-')&&String(b).endsWith('/.ellygent'))throw Object.assign(new Error('injected promotion failure'),{code:'EACCES'});return original(a,b)};require('node:module').syncBuiltinESMExports();`);
  const pull=['context','pull','--project','fixture','--version=B1','--json','--workspace',workspace];
  for(const failure of (process.env.REGRESSION_CASE === 'refresh-before' ? [] : ['download','invalid','manifest','promotion'])) {
    mode=failure; const result=await run(pull,failure==='promotion'?{NODE_OPTIONS:`--require=${preload}`} : {});
    assert.notEqual(result.code,0,JSON.stringify(result));assert.equal(await digest(target),before);
  }
  mode='valid';
  if (process.env.REGRESSION_CASE !== 'refresh-before') {
    const result=await run(pull,{NODE_OPTIONS:`--require=${preload}`,FAIL_ROLLBACK:'1'});
    assert.notEqual(result.code,0);assert.equal(await digest(join(workspace,'.ellygent.previous')),before);
    mode='manifest';assert.notEqual((await run(pull)).code,0);assert.equal(await digest(target),before);
  }
  mode='valid';
  if (process.env.REGRESSION_CASE !== 'refresh-before') {
  const { rename } = await import('node:fs/promises');
  await rename(target,join(workspace,'.ellygent.previous'));
  await mkdir(join(workspace,'.ellygent-refresh.lock'));
  assert.notEqual((await run(pull)).code,0);
  assert.equal(await digest(join(workspace,'.ellygent.previous')),before);
  await rm(join(workspace,'.ellygent-refresh.lock'),{recursive:true});
  mode='manifest';assert.notEqual((await run(pull)).code,0);assert.equal(await digest(target),before);
  mode='valid';
  }

  try { if ((await stat('/dev/shm')).dev !== (await stat(workspace)).dev) crossTemp=await mkdtemp('/dev/shm/ellygent-cli-'); } catch {}
  if(!crossTemp && process.env.REQUIRE_CROSS_FS==='1') throw new Error('Two filesystems required but unavailable');
  const refreshed=await run(pull,crossTemp?{TMPDIR:crossTemp}:{});
  if (refreshed.code !== 0) console.error('refresh failure: prior checksum',before,'current',await digest(target).catch(e=>e.code));
  success(refreshed);
  assert.equal(JSON.parse(await readFile(join(target,'manifest.json'),'utf8')).version.identifier,'B1');
  assert.equal(await readFile(join(target,'project-summary.md'),'utf8'),'# B1 synthetic baseline');
  if(crossTemp) await rm(crossTemp,{recursive:true,force:true});
  console.log(`PASS safe refresh: download/extraction/promotion failures preserve checksum; B1 installed; real cross-filesystem ${crossTemp?'PASS':'NOT TESTED'}`);
  }
  assert.ok(requests.some(r=>r.version==='B1'));
} finally { if(crossTemp) await rm(crossTemp,{recursive:true,force:true}); server.closeAllConnections(); await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true}); }
