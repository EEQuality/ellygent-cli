import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { RELEASE, install } from './install-runtime.mjs';

test('native Windows command remains working after failed candidate upgrades', {skip:process.platform !== 'win32'}, () => {
  const root = mkdtempSync(join(tmpdir(), 'ellygent-windows-upgrade-'));
  const fixture = new URL('../', import.meta.url);
  const env = { ELLYGENT_INSTALL_ROOT: join(root, 'managed') };
  const populate = stage => {
    for (const name of ['package.json','package-lock.json']) writeFileSync(join(stage,name), readFileSync(new URL(name,fixture)));
  };
  const runner = failure => (program,args,cwd) => {
    if (program === 'git') {
      if (args.includes('ls-files')) return ['package.json','package-lock.json'].map(name => {
        const bytes=readFileSync(join(cwd,name));
        return `100644 ${createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex')} 0\t${name}\0`;
      }).join('');
      return args.includes('rev-parse') ? RELEASE.commit : '';
    }
    if (args.includes('ci')) { if(failure==='dependencies') throw Error('synthetic dependency failure'); return ''; }
    if (args.includes('build')) {
      if(failure==='build') throw Error('synthetic build failure');
      mkdirSync(join(cwd,'dist'),{recursive:true});writeFileSync(join(cwd,'dist/index.js'),`console.log(${JSON.stringify(RELEASE.version)});`);return '';
    }
    if (args.includes('--version')) return RELEASE.version;
    throw Error('Unexpected fixture command');
  };
  try {
    const first=install({env,populate,run:runner()});
    const state=readFileSync(join(env.ELLYGENT_INSTALL_ROOT,'current.json'));
    const original=readFileSync(join(first.generation,'dist/index.js'));
    const launch=()=>execFileSync(process.env.ComSpec || 'cmd.exe', ['/d','/c','ellygent.cmd','--version'],{cwd:first.bin,encoding:'utf8'}).trim();
    assert.equal(launch(),RELEASE.version);
    for(const failure of ['dependencies','build','promotion']) {
      assert.throws(()=>install({env,populate,run:runner(failure),...(failure==='promotion'?{promote:()=>{throw Error('synthetic promotion failure');}}:{})}));
      assert.deepEqual(readFileSync(join(env.ELLYGENT_INSTALL_ROOT,'current.json')),state);
      assert.deepEqual(readFileSync(join(first.generation,'dist/index.js')),original);
      assert.equal(launch(),RELEASE.version);
    }
  } finally { rmSync(root,{recursive:true,force:true}); }
});
