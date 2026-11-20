#!/usr/bin/env python3
"""Local Git object fixtures only: no network, npm, real home or installer execution."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = (ROOT / 'scripts/install-runtime.mjs').as_uri()
COMMIT = '51d818776b5aaac0d9beac23eb9d9946f8170b01'
SOURCE_OBJECTS = ROOT / '.git/objects'

PLAN = r'''
import {sourceGit} from RUNTIME_URI;
const rows=[];
const git=sourceGit(process.argv[1],process.argv[2],(program,args,cwd,options)=>{
 if(program!=='git')throw Error('Unexpected fixture program');
 rows.push({args,gitEnv:Object.fromEntries(Object.entries(options.env).filter(([key])=>key.startsWith('GIT_')))});return '';
});
git.initialize();git.invoke(['checkout','--detach',COMMIT]);git.invoke(['rev-parse','HEAD']);git.invoke(['ls-files','--stage','-z']);git.invoke(['status','--porcelain']);
console.log(JSON.stringify(rows));
'''.replace('RUNTIME_URI', json.dumps(RUNTIME)).replace('COMMIT', json.dumps(COMMIT))
VERIFY = r'''
import {readFileSync} from 'node:fs';
import {RELEASE,verifySource,verifyCheckoutBytes} from RUNTIME_URI;
try {verifySource(process.argv[1],{version:"0.1.2",commit:"51d818776b5aaac0d9beac23eb9d9946f8170b01",lockSha256:"6a74281752c87bc2bfbc30300b997e39e250ef5f3ba3f49fdb74200e4af5ebe4"},process.argv[2]);verifyCheckoutBytes(process.argv[1],readFileSync(process.argv[3],'utf8'));console.log('VERIFIED');}
catch {console.log('REFUSED');process.exitCode=2;}
'''.replace('RUNTIME_URI', json.dumps(RUNTIME))

class CheckoutBytesTests(unittest.TestCase):
    def check(self, autocrlf, malicious=False, transform=False):
        with tempfile.TemporaryDirectory(prefix='ellygent-git-byte-fixture-') as temporary:
            root=Path(temporary);stage=root/'source';stage.mkdir();config=root/'private-config'
            marker=root/'inherited-code-ran';attrs=root/'global-attributes';attrs.write_text('* filter=fixture\n')
            hook=root/'hooks';hook.mkdir();post=hook/'post-checkout';post.write_text('#!/bin/sh\nprintf executed > "'+str(marker)+'"\n');post.chmod(0o700)
            template=root/'template';(template/'info').mkdir(parents=True);(template/'info/attributes').write_text('* filter=fixture\n')
            global_config=root/'global.gitconfig'
            global_config.write_text('[core]\n\tautocrlf = '+autocrlf+'\n\teol = crlf\n'+(('\tattributesFile = '+str(attrs)+'\n\thooksPath = '+str(hook)+'\n[init]\n\ttemplateDir = '+str(template)+'\n[filter "fixture"]\n\tsmudge = printf executed > '+str(marker)+'\n\trequired = true\n') if malicious else ''))
            inherited=dict(os.environ,GIT_CONFIG_GLOBAL=str(global_config),GIT_CONFIG_COUNT='1',GIT_CONFIG_KEY_0='core.autocrlf',GIT_CONFIG_VALUE_0=autocrlf)
            plan=subprocess.run(['node','--input-type=module','-e',PLAN,str(stage),str(config)],env=inherited,text=True,capture_output=True,check=True)
            rows=json.loads(plan.stdout);head=None;index=None;status=None
            for number,row in enumerate(rows):
                self.assertNotIn('GIT_CONFIG_COUNT',row['gitEnv'])
                env={key:value for key,value in inherited.items() if not key.upper().startswith('GIT_')};env.update(row['gitEnv'])
                result=subprocess.run(['git',*row['args']],cwd=stage,env=env,capture_output=True,check=True)
                if number==0:
                    # Read trusted existing objects through a task-owned alternate; never fetch.
                    (stage/'.git/objects/info/alternates').write_text(str(SOURCE_OBJECTS.resolve())+'\n')
                    self.assertFalse((stage/'.git/info/attributes').exists())
                elif 'rev-parse' in row['args']:head=result.stdout.decode().strip()
                elif 'ls-files' in row['args']:index=result.stdout
                elif 'status' in row['args']:status=result.stdout
            self.assertEqual(head,COMMIT);self.assertEqual(status,b'');self.assertFalse(marker.exists())
            lock=(stage/'package-lock.json').read_bytes();self.assertNotIn(b'\r\n',lock)
            if transform:
                path=stage/'src/index.ts';path.write_bytes(path.read_bytes().replace(b'\n',b'\r\n'))
            index_path=root/'index.fixture';index_path.write_bytes(index)
            result=subprocess.run(['node','--input-type=module','-e',VERIFY,str(stage),head,str(index_path)],text=True,capture_output=True)
            return result.returncode,result.stdout.strip()
    def test_stale_runtime_pin_refuses_hosted_copy_without_overwriting(self):
        with tempfile.TemporaryDirectory(prefix='ellygent-stale-pin-fixture-') as temporary:
            root=Path(temporary);scripts=root/'scripts';scripts.mkdir();frontend=root/'frontend';hosted=frontend/'public/cli';hosted.mkdir(parents=True)
            for name in ('install-runtime.mjs','publish-to-frontend.js','install.sh','install.ps1'):
                (scripts/name).write_bytes((ROOT/'scripts'/name).read_bytes())
            shell=scripts/'install.sh';body=shell.read_text();import re
            shell.write_text(re.sub(r'RUNTIME_SHA256="[a-f0-9]{64}"','RUNTIME_SHA256="'+'0'*64+'"',body))
            (root/'package.json').write_text('{"type":"module","version":"0.1.2"}')
            current=hosted/'install.sh';current.write_text('existing hosted fixture')
            env=dict(os.environ,FRONTEND_ROOT=str(frontend))
            result=subprocess.run(['node',str(scripts/'publish-to-frontend.js')],env=env,text=True,capture_output=True)
            self.assertNotEqual(result.returncode,0);self.assertEqual(current.read_text(),'existing hosted fixture');self.assertEqual([p.name for p in hosted.iterdir()],['install.sh'])
    def test_inherited_autocrlf_false_uses_exact_blob_bytes(self):self.assertEqual(self.check('false'),(0,'VERIFIED'))
    def test_inherited_autocrlf_true_uses_same_exact_blob_bytes(self):self.assertEqual(self.check('true'),(0,'VERIFIED'))
    def test_inherited_filter_hook_template_never_execute_before_verification(self):self.assertEqual(self.check('true',malicious=True),(0,'VERIFIED'))
    def test_transformed_source_file_is_refused_even_when_package_and_lock_unchanged(self):self.assertEqual(self.check('true',transform=True),(2,'REFUSED'))

if __name__=='__main__':unittest.main()
