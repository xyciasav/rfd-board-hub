import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('event finance details separate cash, in-kind support, total costs, and projected result',async()=>{
  const source=await readFile(new URL('../public/finance-workspace.js',import.meta.url),'utf8');
  assert.match(source,/totalCosts=current\.expenses\+current\.committed/);
  assert.match(source,/currentNet=current\.income-current\.expenses/);
  assert.match(source,/projectedNet=currentNet-current\.committed/);
  for(const label of ['Cash income received','In-kind support','Recorded spending','Pending payouts','Total event costs','Final projected cash net'])assert.match(source,new RegExp(label));
  assert.match(source,/contributionType&&item\.contributionType!==\'Cash\'/);
});
