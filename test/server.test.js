import test from 'node:test';import assert from 'node:assert/strict';
process.env.NODE_ENV='test';process.env.BOARD_PASSWORD='correct horse battery staple';
const {passwordOk}=await import('../server.js');
test('password check accepts configured password',()=>assert.equal(passwordOk('correct horse battery staple'),true));
test('password check rejects another password',()=>assert.equal(passwordOk('wrong'),false));
