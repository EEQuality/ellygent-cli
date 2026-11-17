#!/usr/bin/env node
// Local source maintenance only: update two known wrapper pins, never publish or fetch.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,renameSync,rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const scripts=dirname(fileURLToPath(import.meta.url));
const hash=createHash('sha256').update(readFileSync(join(scripts,'install-runtime.mjs'))).digest('hex');
const updates=[['install.sh',/RUNTIME_SHA256="[a-f0-9]{64}"/g,`RUNTIME_SHA256="${hash}"`],['install.ps1',/\$RuntimeSha256 = "[a-f0-9]{64}"/g,`$RuntimeSha256 = "${hash}"`]].map(([name,pattern,replacement])=>{
 const path=join(scripts,name),body=readFileSync(path,'utf8');
 if([...body.matchAll(pattern)].length!==1)throw Error('Expected exactly one runtime pin in each reviewed wrapper');
 return {path,body:body.replace(pattern,replacement)};
});
for(const {path,body} of updates){const temp=path+'.pin-update.tmp';try{writeFileSync(temp,body,{flag:'wx',mode:0o600});renameSync(temp,path);}finally{rmSync(temp,{force:true});}}
console.log(`Updated reviewed installer runtime SHA256: ${hash}`);
