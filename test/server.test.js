import test from 'node:test';import assert from 'node:assert/strict';
process.env.NODE_ENV='test';process.env.BOARD_PASSWORD='correct horse battery staple';
const {passwordOk,summarizeAggregate,secureRequest,keycloakRole}=await import('../server.js');
test('password check accepts configured password',()=>assert.equal(passwordOk('correct horse battery staple'),true));
test('password check rejects another password',()=>assert.equal(passwordOk('wrong'),false));
test('Buffer aggregate metrics preserve post counts',()=>{const start=new Date('2026-01-01T00:00:00Z'),end=new Date('2026-01-31T00:00:00Z'),summary=summarizeAggregate([{metrics:[{type:'postCount',value:12,unit:'count'},{type:'reach',value:1000,unit:'count'},{type:'reactions',value:80,unit:'count'},{type:'comments',value:20,unit:'count'}]}],start,end);assert.equal(summary.postCount,12);assert.equal(summary.derived.engagements,100);assert.equal(summary.derived.engagementRate,10)});
test('session cookies follow the actual request protocol',()=>{delete process.env.COOKIE_SECURE;assert.equal(secureRequest({headers:{},socket:{}}),false);assert.equal(secureRequest({headers:{'x-forwarded-proto':'https'},socket:{}}),true)});
test('Keycloak roles map to least-privilege hub roles',()=>{assert.equal(keycloakRole({realm_access:{roles:['rfd-admin']}},'hub'),'admin');assert.equal(keycloakRole({resource_access:{hub:{roles:['treasurer']}}},'hub'),'editor');assert.equal(keycloakRole({realm_access:{roles:['offline_access']}},'hub'),'viewer')});
