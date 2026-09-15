import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('container copies every local server module imported by server.js',async()=>{
 const [server,dockerfile]=await Promise.all([readFile(new URL('../server.js',import.meta.url),'utf8'),readFile(new URL('../Dockerfile',import.meta.url),'utf8')]);
 const modules=[...server.matchAll(/from ['"](\.\/[^'"]+\.js)['"]/g)].map(match=>match[1].slice(2));
 for(const module of modules)assert.match(dockerfile,new RegExp(`COPY[^\\n]*${module.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`),`${module} must be copied into the container`);
});
